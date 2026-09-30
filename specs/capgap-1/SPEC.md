# Cap-gap SPEC (capgap-1)

Status: draft for the founder. Today is 2026-09-30. Repository read: /Users/ani/Desktop/Duly/duly (not edited).
Companion files: matrix.json (the rows the tests pin), changes.md (what was done with each review problem).

## 1. Purpose

Duly records an F-1 student's history and computes dates from saved law. When an employer files an
H-1B cap petition that asks for a change of status, the regulation can carry the student's F-1
duration of status and post-completion OPT or STEM OPT past the end of the card. This is the
cap-gap. Since resolutions point 19, Duly has blanked every date a petition could touch and sent
the whole case to the DSO. That wall kept Duly from saying anything wrong, but it also kept it
from saying the many things the saved law does settle.

This SPEC replaces the wall with a design that:

- computes what the saved law settles (who is reached, the latest possible end, the events that
  end it, the card's own dates, the days that count);
- shows what the student's own documents show (the approval notice, the DSO's cap-gap Form I-20),
  labelled as documents and never as Duly's finding;
- steps back to the DSO, by a named item with its own words, only on the point the sources leave
  open, and nulls only the items that point touches;
- asks the person for any fact that decides a date, and re-asks a petition's status when it may
  have gone stale, because DHS does not tell the student of a denial or withdrawal.

The worst failure stays a wrong answer. Every rule below says when Duly says "cannot tell yet" or
steps back rather than guess.

## 2. The design in five questions

Duly answers five questions for each petition, in this order. Each has its own inputs, its own
items, and its own way to stop.

1. **Reach.** Can this petition extend any period on the record? (Resolutions point 23a, kept.)
   The start used is validity_start when approved and entered, else requested_start. A petition
   whose start falls before a period begins takes nothing from that period. A petition must also
   ask for a change of status, be for H-1B, and be subject to the cap as the pack records it.
2. **Terms.** The regulation's conditions: timely filed, a start in the fiscal year consistent with
   a cross-reference that does not resolve, nonfrivolous, and no status violation. Duly can never
   judge these. It checks the facts on the record that bear on them (the filing is not more than 6
   months before the start, the start is in the petition's fiscal year, no recorded unemployment
   over the limit or work outside a span before the filing day) and shows the DSO's cap-gap Form
   I-20 as the document SEVP guidance names as proof. It never says the terms are met.
3. **End.** The latest day the rule allows (April 1 of the fiscal year, or the approved validity
   start if earlier; October 1 for petitions filed before 2025-01-17), and the events that end it
   sooner. This is settled text and is computed whenever its inputs are entered.
4. **Currency.** Is the petition's recorded status still true today? DHS does not notify the
   student (1004-03 9.1.8), and an employer's withdrawal revokes an approval at once ((h)(11)(ii)).
   A dated confirmation from the person is required, and it expires.
5. **After.** What follows the end. Only one case is dated: an approved change of status followed
   by an H-1B start, which ends the F-1 path (a reading of 2016 preamble words, tagged). Every
   other "after" (a denial, rejection, revocation, withdrawal, a pending petition past April 1, a
   gap before a late start) is a named step back with the sources quoted.

Two cross-cutting rules:

- **Regime.** Every cap-gap item carries the operative regime (the 2026-09-14 text, under the D.
  Mass. postponement). The regime has a recheck day (the 2026-10-02 status conference). Past it,
  unless the pack's regime check is rerun, cap-gap items are cannot_tell.
- **The end day.** The rule's own day is shown with the rule's own word ("until", "upon"). For
  April 1 and for the H-1B start, 2024 and 2016 agency words treat that day as outside the
  extension; Duly marks the day before as the last covered day and flags it as a reading. For an
  ending event ("upon"), whether that day is covered is unsettled: counts run through the day
  before, and when adding the event day would change an at-or-over result or a recorded work day
  falls on it, the item steps back.

## 3. What replaces resolutions points 19 to 26

| Point | What it said | Now |
|---|---|---|
| 18 | A petition belongs to the current status when approved with validity start on or after the card start | Kept as the reach test, widened by 23a (pending petitions use requested_start) |
| 19 | Any change-of-status petition nulls every item it could change and raises cap_gap.for_dso | Replaced. cap_gap.for_dso and capgap.petition_for_dso are removed. The five questions above decide what is computed; each open point has its own judgement and nulls only what it touches |
| 20 | Landmarks | Unrelated, unchanged |
| 21 | Outcome and validity start not asked; strict xfails | Reversed. Both are asked when they decide a date (required_when). The strict xfails in the J19 twins turn back on |
| 22, 22b | A stage with a null start or end is unknown, never current; only petition-nulled stages carry the step back | Kept. The reason a stage carries is now the specific judgement id (for example cap_gap.after_end_pending.h1), not cap_gap.for_dso |
| 23, 23a | Reach test; start used; 2020 petition takes nothing | Kept, with one fix: the rule row (October 1 or April 1) is chosen by the petition's filed_on, not by requested_start (contract change C2) |
| 24, 24a | Words name what is taken away; the pack never says "An H-1B petition" for a petition of any type | Kept. The petition record's label becomes "Petition to change or extend status". Pack words say "a petition for H-1B status" only in rules that are about H-1B |
| 25 | Tests pin what 19 and 23 take away | Kept in spirit: the tests pin each judgement's nulls and each boundary day (matrix groups g2 and g6) |
| 26 | Onboarding outcome step may be left | Reversed: the outcome is asked; "I'm not sure" keeps the question open and the verdict cannot_tell |

J12, J13, J14 and J19 get new expectations (section 10).

## 4. The law in plain words

Every quote below is verbatim from a saved file under rulepacks/f1-us/v2026.09/sources. Ids are
from the merged register in Appendix A. "Settled" means regulation text in force; "preamble" and
"guidance" are agency words, not regulation.

### 4.1 Which text is in force

The 2026 fixed-admission rule would move cap-gap to (f)(5)(vii) and shorten the departure period
to 30 days. A court postponed it.

- cg.regime.5, mad-1-26-cv-13799-doc51-order.txt, ECF 51 para 3: "The effective date of the Final
  Rule is hereby POSTPONED pending further order of this court or resolution of this proceeding on
  the merits."
- cg.regime.6, courtlistener-docket-74661796-entries-2026-09-28.json, entry 52: "ELECTRONIC NOTICE
  of Hearing: Status Conference set for 10/2/2026 12:00 PM in Courtroom 1 (In person only) before
  District Judge F. Dennis Saylor IV."
- cg.regime.1, ecfr-8cfr214.2-2026-09-15.xml, (f)(5)(vii)(A): "The status, and any employment
  authorization granted under 8 CFR 274a.12(c)(3)(i)(B) or (C), of an F-1 student ... will be
  automatically extended" (postponed text; same end rule, "status" in place of "duration of status").
- cg.regime.3, fr-2026-14439.xml preamble: "This rule does not change the “cap-gap extension”
  provisions; it simply removes the reference to D/S and makes clear that an automatic extension
  will be granted to those with a fixed period of stay." (preamble of a postponed rule)

Plain words: today the 2026-09-14 text governs. If the order changes, the end dates stay the same
but what is extended changes, and no saved source says how a student admitted for duration of
status would be treated. That is a step back (cap_gap.regime_transition).

### 4.2 What is extended, for whom, until when (settled)

cg.scope.1, ecfr-8cfr214.2-2026-09-14.xml, 8 CFR 214.2(f)(5)(vi)(A): "The duration of status, and
any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) or (C), of an F-1 student who
is the beneficiary of an H-1B petition subject to section 214(g)(1)(A) of the Act (8 U.S.C.
1184(g)(1)(A)) requesting a change of status will be automatically extended until April 1 of the
fiscal year for which such H-1B status is being requested or until the validity start date of the
approved petition, whichever is earlier, where such petition:"

- (A)(1) cg.cond.1: "Has been timely filed;"
- (A)(2) cg.cond.2: "Requests an H-1B employment start date in the fiscal year for which such H-1B
  status is being requested consistent with paragraph (h)(2)(i)(I) of this section; and"
- (A)(3) cg.cond.3: "Is nonfrivolous."

Plain words: two things are extended: duration of status, and only an OPT or STEM OPT
authorization already granted. Three gates: the student is the beneficiary; the petition is subject
to 214(g)(1)(A); it asks for a change of status. The end is the earlier of April 1 of the H-1B
fiscal year and the approved petition's validity start. The text names no start day.

Which text applies to a petition:

- cg.fr24.2, fr-2024-29354.xml preamble: "This final rule will be effective January 17, 2025, and
  will apply to petitions filed on or after that date." This sentence is general, not specific to
  cap-gap; Duly reads it as choosing the rule row by the petition's filed_on (a reading, tagged).
- cg.hist.2, fr-2016-04828.xml, 81 FR 13040 amended (f)(5)(vi)(A): "... shall be automatically
  extended until October 1 of the fiscal year for which such H-1B status is being requested where
  such petition:" with condition (2) "Requests an H-1B employment start date of October 1 of the
  following fiscal year." In force 2016-05-10 to 2025-01-16.
- cg.hist.1, fr-e8-7427.xml, 73 FR 18944 (2008 to 2016): extended "until October 1 of the fiscal
  year for which such H-1B visa is being requested", with no cap-subject gate and no withdrawal
  ground. The pack's closed 10-01 row is split so a 2016 to 2025 petition cites the 2016 words.

Fiscal year: cg.fy.1, usc-31-1102-2026-09-28.htm, 31 U.S.C. 1102: "The fiscal year of the Treasury
begins on October 1 of each year and ends on September 30 of the following year." Reading that
"fiscal year" in (A) is the federal fiscal year is a reading (supported by cg.fy.2, preamble: "For
purposes of the H-1B numerical allocations, each fiscal year begins on October 1."). FY2027's April
1 is 2027-04-01.

Cap-subject: cg.capsubj.1, fr-2016-04828.xml preamble: "DHS clarifies that the Cap-Gap provision
applies only to the beneficiaries of H-1B petitions that are subject to the annual numerical cap."
cg.capsubj.2, (h)(8)(iii)(A)(1) names both "(“H-1B regular cap”)" and "(“H-1B advanced degree
exemption”)" as cap-subject. Whether an advanced-degree petition is "subject to section
214(g)(1)(A)" is not settled: step back.

Not from registration: cg.fr24.6, fr-2024-29354.xml preamble: "DHS declines to adopt the
commenters' suggestions to change the “starting criterion” for the automatic extension from April 1
to March 1, or otherwise to the date that an organization submits an H-1B registration on a
student's behalf." And cg.petition.1, (h)(8)(iii)(A)(4): "A petitioner may file an H-1B cap-subject
petition on behalf of a registered beneficiary only after the petitioner's properly submitted
registration for that beneficiary has been selected for that fiscal year."

### 4.3 What ends it (settled)

cg.term.1, (f)(5)(vi)(B): "The automatic extension of an F-1 student's duration of status and
employment authorization under paragraph (f)(5)(vi)(A) of this section shall automatically
terminate upon the rejection, denial, revocation, or withdrawal of the H-1B petition filed on such
F-1 student's behalf or upon the denial or withdrawal of the request for change of nonimmigrant
status, even if the H-1B petition filed on the F-1 student's behalf is approved for consular
processing."

Related events on the employer's side, cg.petition.5, (h)(11)(ii): "The approval of any petition
is immediately and automatically revoked if the petitioner goes out of business, files a written
withdrawal of the petition, or the Department of Labor revokes the labor certification upon which
the petition is based. The approval of an H-1B petition is also immediately and automatically
revoked upon notification from the H-1B petitioner that the beneficiary is no longer employed."
cg.petition.6, (h)(11)(i)(B): "The director may revoke a petition at any time, even after the
expiration of the petition."

No notice: cg.guid.8, ice-sevp-policy-guidance-1004-03.txt 9.1.8: "A student will not be
personally notified by DHS of a withdrawn or denied H-1B petition."

Validity start: cg.petition.3, (h)(9)(ii)(A) and (B): "If a new H petition is approved before the
date the petitioner indicates that the services or training will begin, the approved petition and
approval notice shall show the actual dates requested by the petitioner as the validity period"
and "If a new H petition is approved after the date the petitioner indicates that the services or
training will begin, the approved petition and approval notice shall show a validity period
commencing with the date of approval". So Duly takes validity_start from the I-797 and never
assumes the requested start.

### 4.4 The status bar and F-2 (settled)

cg.elig.1, (f)(5)(vi)(C): "In order to obtain the automatic extension of stay and employment
authorization under paragraph (f)(5)(vi)(A) of this section, the F-1 student, consistent with 8 CFR
part 248, must not have violated the terms or conditions of his or her nonimmigrant status." Part
248 is not saved. (C) speaks of obtaining the extension; it does not say that a violation during a
running extension ends it.

cg.f2.1, (f)(5)(vi)(D): "An automatic extension of an F-1 student's duration of status under
paragraph (f)(5)(vi)(A) of this section also applies to the duration of status of any F-2
dependent aliens." F-2 is not covered by Duly yet (category_not_covered:f2).

### 4.5 The broken cross-reference and the 6-month rule

(A)(2) cites (h)(2)(i)(I). In both saved eCFR copies, cg.xref.1, (h)(2)(i)(I): "An eligible H-2A or
H-2B nonimmigrant is authorized to start new employment upon the proper filing ..." The
time-of-filing rule is cg.xref.2, (h)(2)(i)(J): "A petition filed under section 101(a)(15)(H) of
the Act may not be filed earlier than 6 months before the date of actual need for the
beneficiary's services or training." Duly does not choose a meaning. It checks (J) on the entered
dates because (J) governs every H petition on its own. If (J) holds on the entered dates, no
reading of the cross-reference fails and nothing steps back for it. If (J) fails, Duly raises a
conflict (are these the dates on the documents?) and then steps back.

### 4.6 The pieces that are only preamble or guidance

These are shown with their tag, never used to compute a date the regulation does not give, except
where marked as a reading.

- Start of the extension: cg.guid.2, 1004-03 9.1: "The cap gap extension starts when a student’s
  current period of F-1 status ends, regardless of whether the student was in a period of OPT.
  However, if the student was not in a period of authorized post-completion OPT on the eligibility
  date, the extension of status starts on the day after the student’s initial grace period
  expires." cg.guid.11, 9.1.4: "the cap gap extension for both employment and F-1 status starts the
  date the student’s original OPT expires". Duly's reading: the card covers every day through
  card_end on its own grant, so the extension's first uncovered day is card_end plus one day. The
  stage start is shown with reading=true and never alone decides a result.
- Work only if OPT was in hand: cg.guid.3, 9.1.2: "No, in order for a student to have employment
  authorization during the cap gap extension, the student must be in an approved period of OPT on
  the eligibility date." It conflicts with cg.guid.15, 9.2.2: "If the F-1 student has an approved
  current or future post-completion OPT on the date the pending or approved change of status
  request to H-1B is received from CLAIMS". Eligibility date, cg.guid.1, 9.1: "The eligibility date
  is the date a USCIS Service Center receives a properly filed Form I-129 Petition for a
  Nonimmigrant Worker naming the student as a beneficiary of the petition from the prospective
  employer."
- Proof: cg.guid.22, 9.2.1 heading: "What proof will a student have that he or she is entitled to
  the extension of work authorization and status?", answered "Using SEVIS, DSOs can print a Form
  I-20, which shows the dates of continued F-1 status and employment authorization."
  cg.guid.14, 9.4.1: "The extension itself is automatic, based on the pending or approved H-1B
  petition." cg.guid.19, 9.1.6: "The student must request a Form I-20 from his or her DSO showing
  the period of the extension." cg.guid.18, 9.3.2: "DSOs are not responsible for initiating any
  actions in connection with the cap gap extensions." cg.guid.23, 9.2.3 (status only): "F-1 status
  for this student has been automatically extended to September 30, [current year]. The student is
  authorized to remain in the United States." cg.ea.5, fr-2016-04828.xml IV.H.2.iii: "the
  combination of the student's expired EAD and his or her Form I-20 Certificate of Eligibility
  endorsed by the designated school official is acceptable proof of identity and employment
  authorization for purposes of Form I-9 requirements."
- SEVIS practice: cg.sits.1, sits-f1-opt-2026-09-28.html: "The requested start date for the H-1B
  is October 1." (one of three SEVIS auto-update conditions; describes SEVIS, not the legal scope).
- Pending on April 1: cg.fr24.8, fr-2024-29354.xml preamble: "If the H-1B petition is still pending
  on April 1, then the beneficiary of the petition is no longer authorized for OPT and the 60-day
  grace period begins on April 1. ... While this is stated in the preamble to the proposed rule,
  DHS declines add this language to the regulatory text."
- After a denial or withdrawal: cg.fr24.12, same preamble: "if the H-1B petition underlying the
  cap-gap extension is denied before April 1, then, consistent with existing USCIS practice, the
  F-1 beneficiary of the petition, as well as any F-2 dependents, would generally receive the
  standard F-1 grace period of 60 days". cg.grace.4, fr-e8-7427.xml: "If USCIS denies a pending
  H-1B petition, the student will have the standard 60-day period (from notification of the denial
  or rejection of the petition) before they have to leave the United States." cg.grace.3,
  fr-2016-04828.xml IV.H.1: "if an employer withdraws the H-1B petition before it is approved, ...
  the student will enter the 60-day grace period to prepare for departure from the United States."
  cg.guid.7, 1004-03 9.1.1 chart: "OPT authorization ends 10 days after the date of the withdrawal
  or denial", which conflicts with cg.guid.21, 9.1.4: "In that case, the employment authorization
  ends and the grace period begins." None of these is regulation; they disagree on the start day.
- Old-rule pending stay: cg.pending.2, fr-2016-04828.xml IV.H.2.i: "DHS clarifies that F-1 status
  for a Cap-Gap beneficiary under this provision expires on October 1, consistent with the
  regulatory text at 8 CFR 214.2(f)(5)(A)(vi). However, an individual with a timely-filed,
  non-frivolous H-1B change-of-status petition will be considered to be in a period of authorized
  stay during the pendency of the petition." cg.pending.1, same: "If an H-1B change-of-status
  petition requesting a start date of October 1 has been approved, the F-1 status will expire on
  the same day as the H-1B status begins."
- Unemployment: cg.guid.5, 1004-03 9.4.3: "Yes, the 90 day limitation on unemployment continues
  during the cap gap extension." cg.guid.26, 1004-03 section 2: "For students on regular
  post-completion OPT or an automatic extension due to the cap gap provisions, the limit is 90
  days. Students with an approved 17-month extension will receive another 30 days of unemployment
  time for a total of 120 days over the entire period of post-completion OPT." So the guidance
  gave a STEM student in cap-gap the STEM total of its day; the pack's reading (150 today) follows
  that structure. Regulation, cg.opt.1, (f)(10)(ii)(E): "Students may not accrue an aggregate of
  more than 90 days of unemployment during any post-completion OPT period described in 8 CFR
  274a.12(c)(3)(i)(B)."
- Travel: cg.travel.1, fr-2016-04828.xml IV.H.2.ii: "DHS clarifies that an F-1 student may
  generally travel abroad and seek readmission to the United States in F-1 status during a Cap-Gap
  period if: (1) The student's H-1B petition and request for change of status has been approved;
  (2) the student seeks readmission before his or her H-1B employment begins". cg.travel.2: "DHS
  also notes that if an F-1 student travels abroad before his or her H-1B change-of-status
  petition has been approved, USCIS will deem the petition abandoned." cg.travel.3: "Therefore, 8
  CFR 214.2(f)(13)(ii) does not apply to F-1 students who depart the United States during a
  Cap-Gap period."
- STEM: cg.stem.1, fr-2016-04828.xml: "A student whose post-completion OPT period has been extended
  under Cap-Gap is in a valid period of post-completion OPT, and may therefore apply for a STEM OPT
  extension during the Cap-Gap period if he or she meets the STEM OPT extension requirements."
  cg.stem.7, footnote 119: "up to 90 days prior to the expiration of the Cap-Gap period on October
  1". cg.stem.3, (f)(12)(ii)(B): "ends when the student's F-1 status expires or the 24-month OPT
  extension concludes, whichever is first."
- Changing employers: cg.ea.3, fr-2016-04828.xml: "Again, an F-1 student may change employers
  during a Cap-Gap period, but must do so in accordance with the OPT regulations ("

## 5. Unsettled questions and how each steps back

Each row: what is open; what Duly computes anyway; the named item; what it nulls. A judgement gives
talk_to_dso. A question gives cannot_tell. Where both are open, cannot_tell wins and both are listed.

| # | Open point | Duly does | Item | Nulls |
|---|---|---|---|---|
| U1 | Regime may change after 2026-10-02 | Carries operative regime on every cap-gap item; recheck_on 2026-10-02 | reason stale:regime.ds_2012 after that day; cap_gap.regime_transition.<h> if the order flips | every cap-gap item (stale); status items (flip) |
| U2 | "Timely filed" undefined | Checks (J) and the fiscal year on entered dates; shows the I-20 | cap_gap.start_condition.<h>, conflict h1b.filed_within_six_months.<h> | the stage end |
| U3 | (h)(2)(i)(I) cross-reference broken | As U2: steps back only when (J) fails on the entered dates | same | same |
| U4 | Advanced-degree petition and 214(g)(1)(A) | Asks cap_basis; the I-20 is shown but does not close it | cap_gap.cap_basis.<h> | stage state unknown; grace |
| U5 | Nonfrivolous | Never judged. Standing words (rule capgap.terms_decided_by_uscis) on every cap-gap stage; a denial or rejection ends the extension through (B) | none (standing words) | nothing |
| U6 | (C) status violation, part 248 not saved | Checks recorded facts before the filing day: unemployment at or over the limit, work outside every span, a reinstatement or withdrawal record | cap_gap.status_facts.<h> | stage end, grace |
| U7 | Start day | Card covers through card_end; stage start card_end plus 1, reading=true; status-only start never dated | cap_gap.status_only.<h> for no OPT on eligibility date | status-only stage dates |
| U8 | Work when OPT not running on the eligibility date (pending I-765, approved future card, STEM pending under 180 days) | Quotes 9.1.2 and 9.2.2 as conflicting | cap_gap.opt_not_running_at_filing.<h> | cap-gap work and counts |
| U9 | End day inside or not | April 1 and H-1B start: last covered day is the day before (reading from cg.fr24.8, cg.pending.1). Event day ("upon"): unsettled | cap_gap.end_day.<h> when the event day changes an at-or-over result or a recorded work day falls on it | the count or the work item it turns on |
| U10 | Pending past April 1 | Stage ends; later dates not stated; preamble quoted | cap_gap.after_end_pending.<h> | grace, anything after |
| U11 | Grace after a termination event | Stage ends upon the event; three sources quoted | grace.after_cap_gap_outcome.<h> | grace |
| U12 | Termination while the card itself still runs | Card items and ordinary grace stand as a reading ((B) ends only "the automatic extension"); founder question F4 | none; reading=true on the grace | nothing |
| U13 | Missing termination day; student not told | Asks outcome_on as the date on the notice; outcome_on_from records the basis | question <h>.outcome_on | stage end |
| U14 | Consular only, or COS not granted on late approval ((h)(9)(ii)(D)(2)) | Asks cos_granted; ends upon cos_ended_on for consular | cap_gap.not_granted_cos.<h> for the late-approval case | stage end |
| U15 | Validity start on late approval or RFE | Uses the entered validity_start only; asks it when approved | question <h>.validity_start | stage end |
| U16 | Appeals, motions, refiling | No revival | cap_gap.filed_after_extension_ended.<h>; words on motions | the new petition's stage |
| U17 | Several petitions | Bound per petition shown | cap_gap.several_petitions.<h> (on each later petition) | stage end, grace |
| U18 | Petitions filed before 2025-01-17 pending after it | 2016 row by filed_on; transition words | cap_gap.rule_transition.<h> when still pending on 2025-01-17 | after-end items |
| U19 | Unemployment in cap-gap | Counted per guidance, tagged; 150 for a chain with STEM (pack reading, cg.guid.26 structure) | at_or_over item plus cap_gap.limit_in_cap_gap.<h> when reached in cap-gap | stage state |
| U20 | STEM duties in cap-gap | Reports due by the card end computed; later ones null | cap_gap.stem_duties.<h> | reports due after the card end |
| U21 | STEM filing window in cap-gap | Tests both readings of (f)(11)(i)(C); steps back when they disagree | cap_gap.stem_filing.<a> | the check |
| U22 | 14-month window | Reading: the specific extension in (A) reaches past it; both quotes shown | none; reading=true | nothing |
| U23 | Transfer or new level in cap-gap | OPT work ends (release date, guidance; day before new level, reading) | cap_gap.move.<mv> | status end |
| U24 | Changing employer | Work counted under the card; petition status re-asked after the petitioner job ends | question <h>.still_current | the new job's standing |
| U25 | Travel | Trip while pending: capgap.trip_while_pending.<t>; after approval: cap_gap.trip_after_approval.<t>; admission class asked | as named | stage after the departure |
| U26 | Proof for Form I-9 | Words quote cg.ea.5 as agency words only | none | nothing |
| U27 | F-2 | Not covered | category_not_covered:f2 | F-2 only |
| U28 | Other classifications, cap-exempt | No extension; ordinary grace computed | cap_gap.not_cap_gap_kind.<h> for the time after the grace while pending | nothing computed after the grace |
| U29 | Fees and proclamations | Nothing said | none | nothing |
| U30 | 2010 guidance still reflecting practice | Shown as guidance with its date; never used for a date the regulation does not give | none | nothing |
| U31 | Earlier H-1B status used (counted before) | No saved source says whether the person is again subject to 214(g)(1)(A) | cap_gap.prior_h1b.<h> | stage |
| U32 | Filed but not receipted, or waitlisted | Asks receipt_on with "no receipt yet" | cap_gap.not_receipted.<h> | stage |

## 6. Records (pack declarations; no contract change)

All in rulepacks/f1-us/v2026.09/parameters.yaml. The case contract already allows any field the pack
declares.

### 6.1 petition (changed)

- label "Petition to change or extend status" (was "H-1B petition"); complete_label "Is this every
  petition filed for this person to change or extend status, of any kind?"
- grows_with_time: true (a statement covers through its `on` day only).
- New fields:
  - filed: choice [yes, not_yet], not_sure. "Has the employer filed it yet, or is it only
    selected?" not_yet: computed as no petition, with the words of cg.fr24.6 and cg.petition.1.
  - cap_basis: choice [regular, advanced_degree], not_sure. Asked when cap_subject is yes.
  - fiscal_year: number, "Fiscal year on the selection notice (for example 2027)". Asked when
    cap_subject is yes.
  - approved_on: date, happened. Asked when outcome is approved, revoked, or withdrawn after
    approval.
  - outcome_on_from: choice [notice, employer], not_sure. "Where the outcome date comes from".
    not_sure leaves the end null.
  - cos_granted: choice [yes, no], not_sure. "Did the approval notice grant the change of status?"
    Asked when outcome is approved and change_of_status is yes.
  - cos_ended_how: choice [withdrawn, denied, consular_only, not_granted_late], not_sure. Asked
    when cos_ended_on is entered.
- Changed labels: change_of_status "When it was filed, did the petition ask for a change of status
  in the US?"; outcome_on "Date printed on the notice, or the date the employer gives";
  h1b_began_on "Day H-1B status took effect (on the approval notice or I-94), not the first day at
  work"; cap_subject "Is it an H-1B petition under the yearly cap (the lottery)? The selection
  notice or the employer can tell."; receipt_on gains the answer "no receipt yet" through a new
  choice field receipt: [received, not_yet], not_sure.
- required_when (contract C3): outcome when change_of_status yes; outcome_on for rejected, denied,
  revoked, withdrawn; validity_start and approved_on when approved; h1b_began_on when approved,
  cos_granted yes, and today is on or after validity_start; receipt_on when the petition reaches a
  period; cap_basis and fiscal_year when cap_subject yes.
- reconfirm (contract C9): confirmation current.<h>, "Is this petition still <outcome> as of
  today?", only when outcome is pending or approved and H-1B has not begun; its `on` must be within
  the engine's max age (founder question F1). Re-asked also when a job with the petitioner ends
  after the last confirmation.

### 6.2 capgap_i20 (new kind, id_prefix i)

"Form I-20 from the DSO showing the cap-gap." Fields: petition (link, petition); program (link);
issued_on (date, happened, school); shows_until (date, school); shows (choice [status_and_work,
status_only], not_sure). complete_label "Is this every cap-gap Form I-20 the DSO has given for
these petitions?" grows_with_time: true. It is evidence of what SEVIS shows (cg.guid.22, cg.guid.14),
never Duly's finding.

### 6.3 Other

- trip: admitted_as, choice [f1, other], not_sure. "Status on the I-94 when you came back". Asked
  for a trip that starts after a change-of-status petition is filed.
- address_change (new kind, id_prefix ac): on (date, happened); grows_with_time. report.type gains
  address_report; report.about may link to address_change.
- facts: f2_dependent choice [yes, no], not_sure (gives category_not_covered:f2 on yes).

### 6.4 Rule rows (pack)

New or changed rows, each with a saved source and one tag:

| id | tag | source |
|---|---|---|
| capgap.end_month_day (10-01, 2008 row) | settled, closed | 73 FR 18944, cg.hist.1 |
| capgap.end_month_day (10-01, 2016 row, new split) | settled, closed | 81 FR 13040, cg.hist.2 |
| capgap.end_month_day (04-01) | settled | cg.scope.1 (unchanged) |
| capgap.rule_row_by_filed_on | guidance, reading | cg.fr24.2 |
| capgap.requires_cos | settled | cg.scope.1, cg.term.1 |
| capgap.cap_basis_open | settled quote, reading | cg.scope.1, cg.capsubj.2 |
| capgap.terms_decided_by_uscis | settled | cg.cond.1 to cg.cond.3, cg.elig.1 (standing words) |
| capgap.i20_is_proof | guidance | cg.guid.22, cg.guid.14, cg.guid.19 |
| capgap.start_day_reading | guidance, reading | cg.guid.11, cg.guid.2 |
| capgap.status_only_start | guidance | cg.guid.2, cg.guid.12 |
| capgap.work_needs_opt_at_filing | guidance | cg.guid.3, cg.guid.15 |
| capgap.end_day_reading | guidance, reading | cg.fr24.8 (April 1), cg.pending.1 (H-1B start) |
| capgap.pending_on_april_1 | guidance | cg.fr24.8 |
| capgap.grace_after_outcome_sources | guidance | cg.fr24.12, cg.grace.3, cg.grace.4, cg.guid.7, cg.guid.21 |
| capgap.old_rule_pending_stay | guidance | cg.pending.2 |
| capgap.no_start_from_registration | guidance | cg.fr24.6 with cg.petition.1 |
| h1b.filing_months_before_need | settled, value 6 | cg.xref.2 |
| capgap.cross_reference_open | settled quote | cg.cond.2, cg.xref.1 |
| opt.post_completion_ds_end_days | litigated, value 60, regime ds_2012 only | cg.grace.2 ((f)(10)(ii)(D) is absent from the 2026-09-15 text) |
| capgap.several_petitions | settled quote | cg.term.1 ("the H-1B petition"), cg.petition.8 ((h)(2)(i)(G) whole) |
| capgap.travel_after_approval | guidance | cg.travel.1, cg.travel.3 |
| capgap.change_employer | guidance | cg.ea.3 |
| capgap.stem_filing | guidance | cg.stem.1, cg.stem.7, cg.guid.10, (f)(11)(i)(C) |
| capgap.stem_duties_open | settled quote | cg.stem.3 |
| capgap.fourteen_months_reading | reading | cg.opt.2, cg.scope.1 |
| capgap.i9_proof | guidance | cg.ea.5 |
| f1.address_report_days | settled, value 10 | cg.opt.5 |
| capgap.f2 | settled quote | cg.f2.1 |
| capgap.status_ends_on_h1b_start | guidance, reading (kept; plain words made conditional) | cg.pending.1 |
| opt.unemployment_in_cap_gap | guidance, reading (kept; note cites cg.guid.26) | cg.guid.5 |

Removed: capgap.petition_for_dso and the check cap_gap.for_dso.

## 7. Contract changes (land first and alone)

One contracts-only PR, before any pack or engine change, with tests for each construct. None of
these is in contracts/ today (checked on 2026-09-30).

- **C1 conditional member in earliest_of and latest_of** (rulepack `when`). A member may carry
  `only_if: [condition]` and `required: true`. Condition false: skipped. Condition true and fact
  absent with required: the whole date is missing and the field is asked. Condition unknown: the
  whole date is missing. Today, `optional` skips an absent member, which would silently give
  April 1 when a denial's day is missing.
- **C2 rule_as_of** on month_day_rule, month_day_is and amount: the day the rule row is looked up
  on (for cap-gap, filed_on). Also `in_fiscal_year_number`: place a month_day_rule in the fiscal
  year named by a number field, with fiscal_year_rule. Today the row is taken on the anchor
  (requested_start).
- **C3 required_when** on record_field: a list of conditions; when true and the field is absent
  or not_sure, the question <record>.<field> is emitted and the verdict is cannot_tell. Conditions
  may read `today` as a field.
- **C4 check.nulls**: ids of items or stages set to null while the check is not true, and the
  stage then carries the check id in its reasons (extends resolutions 22b).
- **C5 stage entry and ends**: stage.only_if (enter only when true; an inverted span enters no
  stage); span.starts.reading; each ends member carries `included` (true, false, unsettled).
- **C6 engine_output stages and judgements**: stages gain status, reading, ends_included (true,
  false, null), operative (regime id). days_total counts through ends when ends_included is true,
  through the day before when false, and is null when null. A new top-level `judgements` array:
  {id, record, rule_ids, status, reading} so each step back carries its words through its rules.
- **C7 path.dates**: named computed dates {id, for_each, when, rule_ids, bound: latest|exact}
  emitted as computed items with status and reading (cap_gap.rule_end.<h>, cap_gap.gap_starts.<h>,
  cap_gap.gap_ends.<h>). A bound item's words say "no later than".
- **C8 regime.recheck_on** in the rulepack and the output reason `stale:regime.<id>` when today is
  after it. Scope: items whose rules sit under a regime and every cap-gap item.
- **C9 record_kind.reconfirm**: {id, only_if, fields, max_age_setting}. The confirmation key is
  <id>.<record>; `when` and conditions may read confirmation.<key>.on. max_age comes from an engine
  setting recorded in DECISIONS.md, not from a rule (no source gives an interval).
- **C10 path.exits**: {when, category, rule_ids}. When `when` is a date on or before today, every
  stage of this pack ends the day before it, and the verdict carries category_not_covered:<category>.
  Used for h1b_began_on. Today this is prose only (programs.md 20.5); the engine raises the reason
  only when case.categories lists h1b.

## 8. Engine and pack behaviour

### 8.1 Reach and kind

For each petition with filed yes:

1. type other: no cap-gap. Ordinary grace computed. If its start falls inside a period, items dated
   on or after the start stay as the card's grant gives them, with an upcoming item for the start
   (capgap.status_ends_on_h1b_start words, conditional). While pending past the end of the grace:
   cap_gap.not_cap_gap_kind.<h>.
2. cap_subject no: as type other.
3. cap_subject not_sure or missing: question; items the petition could change are null; no rule_end.
4. change_of_status no: no cap-gap. change_of_status missing: question.
5. cap_basis advanced_degree: dated stage from the I-20 if entered (as the document shows), and
   cap_gap.cap_basis.<h> always. not_sure or missing: question.
6. Reach (23a) with the rule row chosen by filed_on (C2).
7. An older petition with h1b_began_on entered and a new cap petition: cap_gap.prior_h1b.<h>.

### 8.2 Terms

- (J) check: conflict h1b.filed_within_six_months.<h> when filed_on is before requested_start minus
  6 months (h1b.filing_months_before_need). A yes to "Are these the dates on your documents?" gives
  cap_gap.start_condition.<h>.
- Fiscal-year check: requested_start (or validity_start) outside fiscal_year gives
  cap_gap.start_condition.<h>. For the 2016 row, a start other than October 1
  (capgap.october_start_condition) gives cap_gap.start_condition.<h>.
- Dates-order conflict cap_gap.dates_order.<h>: receipt_on before filed_on; requested_start before
  filed_on; validity_start while pending; h1b_began_on while not approved; cos_ended_on while
  change_of_status no; any happened date after today.
- Status facts before the filing day: cap_gap.status_facts.<h> when the record shows unemployment
  at or over the limit, work outside every span, or a withdrawal without DSO authorization before
  filed_on.
- The I-20: without a capgap_i20 for the petition and with the list whole, cap_gap.ask_dso_for_i20.<h>
  (talk_to_dso; the drafted DSO question asks for the Form I-20 showing the extension). With the
  list not stated, question complete.capgap_i20. With an I-20 issued on or after filed_on:
  - shows_until equal to the rule's named end or the day before it: consistent.
  - shows_until later than the rule's bound as it stood on issued_on: conflict
    cap_gap.i20_after_rule.<h>.
  - shows_until earlier than that bound: cap_gap.i20_earlier.<h> (talk_to_dso), stage end null.
  - shows status_only while the record shows work after the card end: cap_gap.status_only.<h>.
  - An I-20 issued before approved_on is compared only with the bound as it stood then (pending).
- With every check above clean and the I-20 consistent, the stage is dated. The standing words of
  capgap.terms_decided_by_uscis are on the stage. Duly never says the terms are met.

### 8.3 End

- Stage cap_gap.<h>, entered only when the petition reaches a card, the card ends before the rule
  bound, and no ending event came before the card end (C5 only_if).
- starts: card_end plus 1 day (reading, capgap.start_day_reading). For status-only, not dated.
- ends: earliest of the April 1 bound (or October 1 for the 2016 row; included false); validity_start
  when approved (included false); outcome_on when rejected, denied, revoked or withdrawn (required,
  included unsettled); cos_ended_on (required, included unsettled). (C1)
- cap_gap.rule_end.<h>: the bound, computed whenever filed_on, fiscal_year (or the 2016 row) and
  cap_subject yes are entered, shown as "no later than". Null while cap_subject or cap_basis is open.
- Currency: while outcome is pending or approved, the stage end, the unemployment count in the
  cap-gap and grace are null unless current.<h> is within max age.
- Unemployment counters keep programs.md's scope ("each opt_post: its span, extended by its
  cap-gap") with the cap-gap days tagged guidance (opt.unemployment_in_cap_gap); counts run through
  the last surely covered day.
- Work: the existing "days outside every span" check (path SPEC point 5; written in the matrix as
  work.outside_span.<w>, under whatever id the engine gives it) reads the cap-gap span; days after
  the end are outside it.

### 8.4 After

- Approved, cos_granted yes, today before validity_start: the card or cap-gap ends at validity_start
  (included false), reading; upcoming item for validity_start with capgap.status_ends_on_h1b_start.
  No grace stage is entered.
- Today on or after validity_start: question <h>.h1b_began_on. Answered equal: exit to h1b (C10).
  Answered different: conflict cap_gap.new_status_day.<h>.
- Every other end: the named judgement (U10, U11, U14, U16, U17) and no date after the end.
- Grace stage (programs.md) is entered only when no cap-gap reaches the program or the petition's
  outcome is a termination before the card end (U12).

### 8.5 Regime

- Operative ds_2012 carried on every cap-gap item. recheck_on 2026-10-02 (cg.regime.6). After it,
  stale:regime.ds_2012 on cap-gap items until the pack's check is rerun and recheck_on moved.
- If fixed_admission_2026 becomes operative: the end rule is unchanged, but
  cap_gap.regime_transition.<h> (talk_to_dso) is raised on every cap-gap stage, and grace items
  carry the 30-day alternate.

### 8.6 Verdict

As today: questions and conflicts give cannot_tell; judgements give talk_to_dso; otherwise
no_open_items. The standing words on a dated cap-gap stage are not an open item. A future event (the
April 1 bound, an H-1B start) is an upcoming item, not a missing fact.

## 9. The words

Rules for every string: plain, calm, one idea per sentence, no "you must", no advice, no conclusion
about the person, no long dashes, no emoji. Pack words (rules[].plain) are never about a person;
web/src/lib/labels.ts speaks to the person.

Pack plain words (examples):

- capgap.end_month_day (04-01): "For an F-1 student who is the beneficiary of an H-1B petition
  subject to the yearly cap, as Duly reads section 214(g)(1)(A), that asks for a change of status,
  duration of status and the OPT or STEM OPT already granted last on their own until April 1 of the
  H-1B fiscal year. If the approved petition starts earlier, they last until then."
- capgap.terms_decided_by_uscis: "The rule also requires that the petition was filed on time, is not
  frivolous, and that the student kept status. USCIS decides these, not Duly and not the DSO. A
  rejection or denial ends the extension."
- capgap.i20_is_proof: "SEVP guidance names the Form I-20 the DSO prints from SEVIS as the proof of
  the extension. The extension itself comes from the petition, not from the form."
- capgap.end_day_reading: "Agency words say work under the extension stops on April 1, and that F-1
  status ends the day H-1B status begins. Duly takes the day before as the last day covered. This
  is a reading."
- capgap.grace_after_outcome_sources: "No regulation says what follows when a petition is denied,
  rejected, revoked or withdrawn. Agency words from 2008, 2010, 2016 and 2024 speak of a 60-day
  period but disagree on the day it starts. The DSO can say which day applies."
- capgap.pending_on_april_1: "Agency words from 2024 say that if the petition is still pending on
  April 1, work stops and a 60-day period begins that day. The agency chose not to put this in the
  regulation."
- capgap.status_ends_on_h1b_start: "Agency words from 2016 say that when an H-1B change of status
  is approved, F-1 status ends the day H-1B status begins. If the approval is withdrawn or revoked
  before then, the card's own dates apply. This is guidance, read by Duly for any start date."
- capgap.no_start_from_registration: "A registration or a selection does not start the extension.
  The regulation lets the employer file only after the selection, and the extension reaches a filed
  petition. This is a reading of the agency's words."

labels.ts words (examples):

- Stage title: "Cap-gap: F-1 status and OPT carried past the card".
- Dated stage: "From Jun 1, 2026, until Apr 1, 2027 at the latest, as your Form I-20 of Apr 20, 2026
  shows. It ends sooner if the petition is approved with an earlier start, or is rejected, denied,
  revoked or withdrawn."
- ask_dso_for_i20: "SEVP guidance says the DSO can print a Form I-20 showing the cap-gap. Your DSO
  can tell you what SEVIS shows for this petition." Drafted DSO question: "My employer filed an
  H-1B petition for me on <date>, receipt <date>, asking for a change of status. Could you print a
  Form I-20 showing the cap-gap extension, or tell me what SEVIS shows?"
- still_current: "Is this petition still pending today? DHS does not send the student a notice of a
  denial or withdrawal, so your employer is the best source."
- after_end_pending: "The rule's extension for this petition ended on Apr 1, 2026. What applies
  while the petition is still pending is for your DSO. Agency words from 2024 are shown below; they
  are not a regulation."

Words never shown: "you are eligible", "you are in status", "you are covered", "you can work",
"you must leave".

## 10. Journeys and tests

- J12: gains cap_basis regular, fiscal_year 2027, receipt_on 2026-04-03, approved_on 2026-06-20,
  cos_granted yes, capgap_i20 i1 (issued 2026-04-20, shows 2027-04-01, status_and_work), current.h1
  on the test day. Expected (matrix g3.01): stage cap_gap.h1 from 2026-06-01 (reading) ending
  2026-10-01 excluded; no grace; unemployment.opt_card.a1 0; verdict no_open_items. Without the
  I-20: cap_gap.ask_dso_for_i20.h1.
- J13 (matrix g4.01): stage ends upon 2026-08-14; cap_gap.end_day.h1 (w1 worked on the event day);
  grace.after_cap_gap_outcome.h1; talk_to_dso.
- J14 (matrix g4.03): stage ends upon 2026-07-25; unemployment.opt_card.a1 40 stands;
  unemployment.total.a1 84 (reading); cap_gap.stem_duties.h1; grace.after_cap_gap_outcome.h1.
- J19 (matrix g2.01): h9 takes nothing; point 21's strict xfails turn back on (validity_start asked
  when approved and missing).
- The acceptance clock is 2026-09-29; matrix rows state their own day (default 2026-09-30) and the
  tests use clock_on for them.
- Tests pin every row of matrix.json, each boundary pair on both sides, and one mutant per C1 to C10
  construct.

## 11. Open questions for the founder

- F1. Petition currency: how old may the person's "still pending" or "still approved" answer be
  before Duly asks again? No source gives a number. Proposed 30 days, recorded in DECISIONS.md as a
  product setting, shown to the person as "as of <date>".
- F2. The I-20 as proof. This SPEC lets a consistent cap-gap Form I-20, with clean record checks and
  a current petition status, date the stage and reach no_open_items, with standing words that USCIS
  decides the terms. The basis is SEVP guidance naming the I-20 as proof of entitlement (9.2.1). The
  residual risk: SEVIS extends on receipt from CLAIMS, so the I-20 is not an adjudication. Accept, or
  keep a step back on every pending petition (the wall, narrower)?
- F3. Advanced-degree petitions: always step back (this SPEC), or let the I-20 close it as in F2?
- F4. A denial while the card still runs: this SPEC keeps the card and the ordinary grace as a
  reading ((B) ends only "the automatic extension"). The 2008 preamble and the 2010 chart are in
  the context of the extension. Accept the reading, or step back on every denial?
- F5. Stale regime after 2026-10-02: block only cap-gap and regime-bound items (this SPEC) or the
  whole verdict?
- F6. The 14-month window: accept the reading that (A) reaches past it (this SPEC), or step back on
  every cap-gap that ends after program end plus 14 months (which is nearly every cap-gap)?
- F7. Unemployment limit for a STEM chain in cap-gap: keep the pack's reading (150) or move to the
  stricter 90 of the 2010 answer?
- F8. Whether the new label "Petition to change or extend status" and the wider completeness question
  fit onboarding.
- F9. Motions and appeals after a denial: add a record field for them, or leave them to the grace
  step back that every denial already carries (this SPEC)?

## Appendix A. Merged provision register

Ids are extraction 1's, plus the ids the reconciliation note added (cg.guid.0, cg.guid.11 to
cg.guid.20, cg.ea.5, cg.stem.4 to cg.stem.7, cg.opt.5, cg.sits.3), plus ids added here (marked new).
Extraction 2's ids are not used. Each quote was found in the saved file (reconciliation of
2026-09-30 and a recheck for this SPEC). Short form: file, location, quote.

- cg.scope.1: ecfr-8cfr214.2-2026-09-14.xml, (f)(5)(vi)(A) intro: see 4.2.
- cg.cond.1 / cg.cond.2 / cg.cond.3: same file, (f)(5)(vi)(A)(1) to (3): see 4.2.
- cg.term.1: same file, (f)(5)(vi)(B): see 4.3.
- cg.elig.1: same file, (f)(5)(vi)(C): see 4.4.
- cg.f2.1: same file, (f)(5)(vi)(D): see 4.4.
- cg.xref.1: same file, (h)(2)(i)(I) first sentence: "An eligible H-2A or H-2B nonimmigrant is authorized to start new employment upon the proper filing, in accordance with 8 CFR 103.2(a), of a nonfrivolous H-2A or H-2B petition on behalf of such alien requesting the same classification that the nonimmigrant alien currently holds, or as of the requested start date, whichever is later."
- cg.xref.2: same file, (h)(2)(i)(J): see 4.5.
- cg.xref.3: same file, (h)(8)(iii)(A)(3): "The annual initial registration period will last a minimum of 14 calendar days and will start at least 14 calendar days before the earliest date on which H-1B cap-subject petitions may be filed for a particular fiscal year, consistent with paragraph (h)(2)(i)(J) of this section."
- cg.xref.4: fr-2026-14439.xml, preamble, footnote 324 sentence: "Petitioners may not file H-1B petitions more than 6 months before the date of actual need for the employee."
- cg.fy.1: usc-31-1102-2026-09-28.htm: see 4.2. cg.fy.2: fr-2026-14439.xml preamble: see 4.2.
- cg.fy.3: fr-2016-04828.xml, footnote 118: "As H-1B visas are authorized by fiscal year, and thus may begin to authorize employment as early as the first date of the fiscal year (October 1), the filing window for cap-subject H-1B petitions opens (and generally closes) six months earlier (April 1 of the preceding fiscal year)."
- cg.hist.1: fr-e8-7427.xml, amended (f)(5)(vi)(A): "(A) The duration of status, and any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) and (C), of an F-1 student who is the beneficiary of an H-1B petition and request for change of status shall be automatically extended until October 1 of the fiscal year for which such H-1B visa is being requested where such petition:"
- cg.hist.2: fr-2016-04828.xml, amended (f)(5)(vi)(A): see 4.2.
- cg.fr24.1: fr-2024-29354.xml, DATES: "This final rule is effective January 17, 2025."
- cg.fr24.2: same, implementation response: see 4.2.
- cg.fr24.3: same, RIA xv: "Under current regulations, the automatic cap-gap extension is valid only until October 1 of the fiscal year for which H-1B status is being requested. DHS is changing the automatic extension end date from October 1 to April 1 to avoid disruptions in employment authorization that some F-1 nonimmigrants awaiting the change to H-1B status have been experiencing over the past several years."
- cg.fr24.5: same, III.9: "To qualify for this automatic extension, an F-1 student must be the beneficiary of a pending, timely-filed, non-frivolous H-1B cap-subject petition that requests a change of status."
- cg.fr24.6: same, cap-gap responses: see 4.2.
- cg.fr24.7: same: "The commenters' suggested language regarding petitions that have not been finally adjudicated would also allow extensions of status and work authorization for petitions that have been denied and appealed, which was not contemplated in the proposed rule."
- cg.fr24.8: same: see 4.6.
- cg.fr24.9: same: "the term “frivolous,” means that there is no arguable basis in law and fact"
- cg.fr24.11: same, out-of-scope list: "A request that USCIS promulgate regulations to extend H-1B cap gap benefits to F-1 students seeking to apply for the O-1B classification"
- cg.fr24.12 (new): same, response on the 60-day grace period: see 4.6.
- cg.capsubj.1: fr-2016-04828.xml IV.H.2.i: see 4.2. cg.capsubj.2: ecfr 2026-09-14, (h)(8)(iii)(A)(1): "before a petitioner can file an H-1B cap-subject petition for a beneficiary who may be counted under section 214(g)(1)(A) of the Act (“H-1B regular cap”) or eligible for exemption under section 214(g)(5)(C) of the Act (“H-1B advanced degree exemption”), the petitioner must register"
- cg.petition.1: ecfr 2026-09-14, (h)(8)(iii)(A)(4): see 4.2.
- cg.petition.2: same, (h)(8)(iii)(D)(3): "An H-1B cap-subject petition must be properly filed within the filing period indicated on the relevant selection notice. The filing period for filing the H-1B cap-subject petition will be at least 90 days. If petitioners do not meet the requirements of this paragraph (h)(8)(iii)(D), USCIS may deny or reject the H-1B cap-subject petition."
- cg.petition.3: same, (h)(9)(ii)(A) and (B): see 4.3.
- cg.petition.4: same, (h)(9)(ii)(D)(2): "However, the petition will not be forwarded to the Department of State nor will any accompanying request for a change of status, an extension of stay, or amendment of stay, be granted."
- cg.petition.5, cg.petition.6: same, (h)(11)(ii), (h)(11)(i)(B): see 4.3.
- cg.petition.7: same, (h)(2)(i)(G) third sentence: "Otherwise, filing more than one H-1B petition by an employer on behalf of the same alien in the same fiscal year will result in the denial or revocation of all such petitions."
- cg.petition.8 (new): same, (h)(2)(i)(G) first two sentences: "An employer may not file, in the same fiscal year, more than one H-1B petition on behalf of the same alien if the alien is subject to the numerical limitations of section 214(g)(1)(A) of the Act or is exempt from those limitations under section 214(g)(5)(C) of the Act. If an H-1B petition is denied, on a basis other than fraud or misrepresentation, the employer may file a subsequent H-1B petition on behalf of the same alien in the same fiscal year, provided that the numerical limitation has not been reached or if the filing qualifies as exempt from the numerical limitation."
- cg.ea.1: fr-2016-04828.xml, amended 274a.12(c)(3)(i): "(B) Is seeking authorization to engage in up to 12 months of post-completion Optional Practical Training (OPT) pursuant to 8 CFR 214.2(f)(10)(ii)(A)("
- cg.ea.2: same, amended 274a.12(b)(6)(v): "(v) Pursuant to 8 CFR 214.2(h) is seeking H-1B nonimmigrant status and whose duration of status and employment authorization have been extended pursuant to 8 CFR 214.2(f)(5)(vi)."
- cg.ea.3: same, IV.H.2.i: see 4.6. cg.ea.5: same, IV.H.2.iii: see 4.6.
- cg.pending.1: same, IV.H.2.i: see 4.6. cg.pending.2 (new, extraction 2's cg.end.4): same: see 4.6.
- cg.grace.1: ecfr 2026-09-14, (f)(5)(iv): "An F-1 student who has completed a course of study and any authorized practical training following completion of studies will be allowed an additional 60-day period to prepare for departure from the United States or to transfer in accordance with paragraph (f)(8) of this section."
- cg.grace.1b (new): same paragraph: "However, an F-1 student who fails to maintain a full course of study without the approval of the DSO or otherwise fails to maintain status is not eligible for an additional period for departure."
- cg.grace.2: same, (f)(10)(ii)(D): "For a student with approved post-completion OPT, the duration of status is defined as the period beginning on the date that the student's application for OPT was properly filed and pending approval, including the authorized period of post-completion OPT, and ending 60 days after the OPT employment authorization expires." Absent from the 2026-09-15 text.
- cg.grace.3: fr-2016-04828.xml IV.H.1: see 4.6. cg.grace.4: fr-e8-7427.xml section B: see 4.6.
- cg.opt.1: ecfr 2026-09-14, (f)(10)(ii)(E): see 4.6 (first two sentences: "During post-completion OPT, F-1 status is dependent upon employment. Students may not accrue ...").
- cg.opt.2: same, (f)(10)(ii)(A)(3): "A student must complete all practical training within a 14-month period following the completion of study, except that a 24-month extension pursuant to paragraph (f)(10)(ii)(C) of this section does not need to be completed within such 14-month period."
- cg.opt.3: same, (f)(10)(ii)(B): "Authorization to engage in optional practical training employment is automatically terminated when the student transfers to another school or begins study at another educational level."
- cg.opt.4: same, (f)(12)(i): "An F-1 student who is granted employment authorization by USCIS to engage in optional practical training is required to report any change of name or address, or interruption of such employment to the DSO for the duration of the optional practical training."
- cg.opt.5: same, (f)(17): "A student must inform DHS and the DSO of any legal changes to the student's name or of any change of address, within 10 days of the change, in a manner prescribed by the school."
- cg.stem.1, cg.stem.2, cg.stem.7: fr-2016-04828.xml IV.H.2.i and footnote 119: see 4.6; cg.stem.2: "Please note, however, that if the H-1B petition upon which the student's Cap-Gap period is based has been approved and is not withdrawn prior to October 1, the student's change to H-1B status will take effect on October 1, and the student will no longer be eligible for a STEM OPT extension."
- cg.stem.3: ecfr 2026-09-14, (f)(12)(ii)(B): see 4.6. cg.stem.4: same, (f)(10)(ii)(C) opening: "a qualified student may apply for an extension of OPT while in a valid period of post-completion OPT". cg.stem.5: fr-2024-29354.xml: "the lengthier extension of F-1 status and post-completion OPT or 24-month extension of post-completion OPT employment authorization". cg.stem.6: fr-2016-04828.xml, amended 274a.12(b)(6)(iv): "and ending on the date of USCIS' written decision on the current Form I-765 or successor form, but not to exceed 180 days".
- cg.travel.1 to cg.travel.3: fr-2016-04828.xml IV.H.2.ii: see 4.6. cg.travel.4: ecfr 2026-09-14, (f)(13)(ii): "An F-1 student who has an unexpired EAD issued for post-completion practical training and who is otherwise admissible may return to the United States to resume employment after a period of temporary absence. The EAD must be used in combination with a Form I-20 or successor form endorsed for reentry by the DSO within the last six months."
- cg.regime.1 to cg.regime.6: see 4.1 (cg.regime.2: ecfr 2026-09-15, (f)(5)(v): "An F-1 student who has completed a course of study and any authorized practical training will be allowed an additional 30-day period"; cg.regime.4: fr-2026-14439.xml DATES: "The effective date is September 15, 2026.").
- cg.guid.0: ice-sevp-policy-guidance-1004-03.txt, cover footnote 1: "This guidance does not, in any way, replace or supersede those laws or regulations."
- cg.guid.1, cg.guid.2: 1004-03 9.1: see 4.6. cg.guid.3: 9.1.2: see 4.6.
- cg.guid.4: 9.1.3: "It is important to note that, although the extension is automatically granted, SEVIS may not be automatically updated to show the extension."
- cg.guid.5: 9.4.3: see 4.6. cg.guid.6: 9.4.2: "Yes, provided the student has a valid EAD. See 8 CFR 214.2(f)(13)." (contradicted by cg.travel.3)
- cg.guid.7: 9.1.1 chart: see 4.6. cg.guid.8: 9.1.8: see 4.3.
- cg.guid.9: 6.8 (line 745): "Would not be eligible for the cap gap extension of OPT."
- cg.guid.10: 8.2.3: "The student will need to have his or her employer request the withdrawal of the approved or pending H-1B petition in time for"
- cg.guid.11: 9.1.4: see 4.6. cg.guid.12: 9.1.4: "For a student whose post-completion OPT expired prior to the filing date of the H-1B petition, the cap gap extension starts at the end of his or her grace period"
- cg.guid.13: 9.1.5: "If the H-1B petition is pending beyond October 1, a student can remain in the United States based on the pending change of status petition."
- cg.guid.14: 9.4.1: see 4.6. cg.guid.15: 9.2.2: see 4.6.
- cg.guid.16: 7.1.8 (line 841): "counts as unemployment against the 90/120-day limits"
- cg.guid.17: 9.4.4: "the student must report any change of address within 10 days"
- cg.guid.18: 9.1.3 and 9.3.2: "A student is responsible for checking with his or her DSO and verifying that his or her SEVIS record has been updated with the extension." and see 4.6.
- cg.guid.19: 9.1.6: see 4.6. cg.guid.20: 9.4.2: "SEVP recommends that a student not travel outside the United States during the cap gap extension"
- cg.guid.21 (new): 9.1.4: "In that case, the employment authorization ends and the grace period begins."
- cg.guid.22 (new): 9.2.1: see 4.6.
- cg.guid.23 (new): 9.2.3: see 4.6.
- cg.guid.24 (new): 9.3.1: "SEVIS Release 6.0 allows a DSO to add the cap gap extension if a student is the beneficiary of a properly filed (prior to receipting by USCIS) or waitlisted H-1B petition."
- cg.guid.25 (new): 9.1.7: "Until USCIS issues receipt notices, only the petitioning employer will know when the application was properly filed or wait listed."
- cg.guid.26 (new): section 2 (lines 458 to 462): see 4.6.
- cg.sits.1: sits-f1-opt-2026-09-28.html, H-1B Cap-Gap Extension of OPT: see 4.6. cg.sits.2: OPT Types table: "For students whose prospective employers filed a qualifying H-1B-cap subject petition." cg.sits.3: Post-completion OPT and Unemployment: "A student whose record lacks employer information is considered unemployed."
