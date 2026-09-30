> On the founder's question about the screen: no, that is not how Duly will look. Section 9 below explains why and what replaces it.

# Part 1. The section to add to specs/path-1/SPEC.md

Put it after "The engine (L-engine)". Section 21 lists what it changes in the parts above it.

## 8. Why the record changes first

On 2026-09-29 the founder found that the case holds one `degree_level`, and that the engine reads it only inside the words of one question. Real students have several programs, at several schools and levels.

We checked twenty real student journeys against the model (Part 3). None of them fits. Each one gives a wrong answer, or a "no open items" verdict it should not give:

- a transfer between schools is never checked, and a grace date is shown for a student who is still enrolled;
- STEM dates are shown as the next step for a degree that is not STEM, or that is from outside the US;
- the unemployment count keeps running after OPT ended with a change of level;
- a lawful cap-gap job is flagged, and a grace date is shown after a denial;
- CPT is one number the student counts alone, and a job cannot say which permission it was under.

All of these come from one shape: one program, one OPT card, one STEM card, one CPT number, and nothing that links a job, a card or a trip to a program.

The path model is built next. As written, it keeps that shape: point 7 translates case_f1, and each stage exists once. So the record changes here, before the engine is written. D12 asks for every F-1 nuance, D47 for every case, and PRINCIPLES 2 for asking, never assuming.

## 9. What the student sees (L-web)

The page in web/src/components/CaseForm.tsx is a bench for testing the engine. It is one long form of fieldsets, with "Include OPT" boxes and one of everything. It is not Duly's app.

Duly's app is the canvas: the approved screens in design/canvas/, with their tokens, type, spacing and motion (D52, D53). The Onboarding and Timeline screens are not built yet. Register rows ONB-001 to ONB-010 and TIME-001 to TIME-021 are not_started.

In this round:

- L-web builds the onboarding of section 18 on the canvas's Onboarding screen.
- The bench leaves the student's path. A production build of web/ and desktop/ does not include it. It stays as a development page for the engine's tests.
- Every output item carries `record` (Part 2), so the Timeline can draw one row per program, card, move and trip. The Timeline and Home are built in the desktop round (D48), from this output.

## 10. The record (contracts)

A case is facts and records. A record has an id, a kind and fields. The pack declares each kind and its fields (section 13). The contract can hold any pack's records (Part 2).

- A field left out is not known. It is never read as no, none or zero.
- A link field names another record by its id.
- Some choices take the answer "not sure". That is an answer. It is recorded with its day, and anything that turns on it goes to the DSO.
- Nothing is preselected. The bench's default of "bachelor" goes (J16).

The F-1 pack declares the kinds below. "Asked when" says when the form asks for a field. The engine also asks for any field that a shown item needs.

**program** (p1, p2 ...): one per program of study, in the US or not.

| Field | Value | Asked when |
|---|---|---|
| where | choice: us_on_f1, us_other_status, outside_us | always |
| school_name | text | always |
| school_code | text, as printed on the I-20 | when the I-20 shows it; never required |
| level | choice: secondary, language_training, associate, bachelor, master, doctorate, professional, other | always |
| field_name | text, as printed | always |
| cip_code | text: two digits, a point, four digits | us_on_f1, us_other_status |
| stem_list | choice: on_list, not_on_list; not sure | when a STEM step or basis turns on it |
| start_date | date | us_on_f1 |
| end_date | date on the newest I-20. Its history comes from end_date_change | us_on_f1 |
| state | choice: in_progress, completed, left_before_completing | always |
| coursework_done_on | date all course requirements were done, apart from a thesis or its equivalent | completed, or when OPT rests on it |
| conferred_on | date | when the degree could be a STEM basis |
| first_year_done_on | date the first full academic year was done, from the school | pre-completion OPT |
| first_year_before_training | choice: yes, no; not sure | CPT or OPT on this program |
| immediate_cpt | choice: yes, no; not sure (the program requires CPT from the start) | graduate level, CPT before the first year |
| dual_with | link: program | part of a dual degree |
| full_course_each_term | choice: yes, no; not sure | us_on_f1 |
| online_within_limit | choice: yes, no; not sure | us_on_f1 |
| cpt_days_stated | count, translation only | never |

**move** (mv1 ...): from one program to the next.

| Field | Value | Asked when |
|---|---|---|
| how | choice: transfer, change_of_level, new_initial_i20 | always |
| from_program, to_program | link: program | always |
| told_school_on | date | transfer |
| release_date | date | transfer; change_of_level when the DSO set one |
| i20_issued_on | date | always |
| contacted_new_dso_on | date | transfer |
| registered_on | date | when known |

**end_date_change** (ec1 ...): program (link), change (extension, shortened), old_end, new_end, requested_on (for an extension), granted_on, reason (academic, medical, other; not sure).

**authorization** (a1 ...): one per grant of permission to work.

| Field | Value | Asked when |
|---|---|---|
| type | choice: cpt, opt_pre_completion, opt_post_completion, stem_extension, off_campus_hardship, international_organization | always |
| program | link: the program it rests on | always |
| extends | link: authorization | stem_extension |
| basis_program | link: program | stem_extension |
| time | choice: full_time, part_time; not sure | cpt, opt_pre_completion |
| employer | link: employer | cpt |
| dso_on | date: for CPT, the day the DSO signed the I-20 for it; otherwise the day the DSO entered the recommendation | always |
| filed_on | date | all but cpt |
| decision | choice: pending, approved, denied, withdrawn; not sure | all but cpt |
| decided_on | date | decision is not pending |
| card_start, card_end | dates on the EAD; for CPT, the dates on the I-20 | approved |
| split_noted | choice: yes, no; not sure | two post-completion OPT at one level |

**employer** (e1 ...): name, and e_verify (yes, no; not sure), asked when a STEM step or card turns on it.

**work** (w1 ...): employer (link); under (link: authorization), or on_campus (link: program) for a job on campus; start; end (absent while it goes on); hours_per_week; hours_changes (periods, when hours changed within the job); employer_reported (translation only).

**report** (r1 ...): type (validation, evaluation_12_month, evaluation_final, i983_new, i983_changed, change_report, interruption_report), about (link: authorization or work), made_on.

**trip** (t1 ...): left_on; returned_on (absent while away); purpose (job_travel, approved_leave, personal, study_abroad; not sure); reentry_i20 (link: the program whose I-20 was shown); signature_on (the DSO's travel signature on it) and job_on_return (yes, no; not sure), both asked when the return falls inside post-completion OPT or STEM.

**petition** (h1 ...): type (h1b); cap_subject (yes, no; not sure); employer; filed_on; receipt_on; requested_start; change_of_status (yes, no); cos_ended_on (the change of status was withdrawn or moved to consular processing); outcome (pending, approved, denied, rejected, withdrawn, revoked); outcome_on; validity_start (approved); h1b_began_on.

**withdrawal** (wd1 ...): program, on, dso_authorized (yes, no; not sure).

These are held in this round and not computed (section 20):

- **term** (tm1 ...): program, start, end, type (term, annual_vacation), credits, online_credits, full_course_credits.
- **reduced_load** (rl1 ...): program, reason (language_or_academic, medical, final_term, other; not sure), starts, ends, approved_on, credits, resumed_on.
- **reinstatement** (ri1 ...): program, filed_on, decided_on, decision (pending, approved, denied).

## 11. What Duly works out from the links (L-engine, L-content)

Duly computes these from facts. It never asks the student for them.

- The level of a card, a job or a CPT is its program's `level`.
- Same level means the same `level` value, at any school. "Higher level" follows the pack's order of levels (section 13, point 2). That order is Duly's reading, and it is marked so. Secondary, language_training, professional and other have no place in the order. A comparison with one of them is unknown, and the DSO is asked.
- The end date in force on a day is the program's `end_date`, moved back through its end_date_change records.
- An OPT or STEM authorization ends at card_end, or earlier when a move leaves its program:
  - The regulation ends it when the student "transfers to another school or begins study at another educational level". For a change of level, that is the day before the new program starts. For a transfer, the words name no day. Duly reads it as the release date, and marks that as a reading.
  - SEVP's guidance ends it on the release date.
  - When the two give different days, Duly shows both with their sources. It leaves the items that use the end null and raises the judgement item `<stage>.end_by_source.<record>` (talk_to_dso).
- The school that holds the SEVIS record is the from-program's school until the release date, and the to-program's school after it.
- A total OPT period is one post-completion OPT authorization plus each STEM authorization that extends it.
- A new employer on a STEM card is a work record under it whose employer differs from the one before. The question `employment.<n>.new_employer` is asked only when the employer is not entered.
- A job ends only at a work record's `end`. A change of hours is not an end. It gives no concluding evaluation and no report that a job ended.
- A job's permission is its `under` link, or `on_campus`. A job on campus is never counted as OPT work.
- Days abroad come from trip records.

## 12. A list is whole only when the student says so

The case holds `complete`: the student's statement that a list is whole, with its day. The key is a kind ("program"), or a kind plus the record its items link to ("authorization:p2" means every authorization for program p2).

- Until a list that a shown item or the verdict uses is stated whole, the verdict is cannot_tell with `unconfirmed:complete.<key>`, and a question asks for the statement.
- For work, trip, report and move, a statement covers the days through its own day. A trip statement also holds `from`, the day the list starts. On a later day the question opens again for the days since (product-1 point 3).
- For a records case, this replaces D41's question and product-1 point 39. The student lists every program and card, and Duly counts. It does not guess from one card. The translation keeps both question ids (section 19).
- A new check for every pack is `record.ends_before_today`. When today is after the end of every span in the record, and no later record exists, Duly asks: "Your record ends on <date>. Is there anything after it to add?" Until that is answered, the verdict is cannot_tell. "Nothing after it" gives talk_to_dso with the judgement item, and Duly says nothing about what it means (J04, J09, J10, J13).

## 13. What a pack can say about records (contracts)

The engine stays a reader. No kind, field, choice value or rule of any pack is written in engine/path.py. Everything below is in contracts/rulepack.schema.json (Part 2).

1. **Record kinds.** `path.records` declares each kind: its id prefix, how many records it may have, whether its list grows with time, and its fields. A field has a kind (date, count, number, flag, choice, text, link, periods) and a label. Where they apply, it also has choices, whether "not sure" is an answer, the kinds a link may name, a pattern, `happened`, `school`, `translation_only` and `history`.
2. **An order.** `path.order` lists one field's choices from lowest to highest, with the rules that support the order. A comparison with a value that is not in the list is unknown.
3. **A stage for each record.** A stage with `for_each` is entered once for each record that matches. Its instance id is `<stage id>.<record id>`. Every item, question and conflict it raises ends its id with the record id and carries `record` in the output.
4. **Paths.**
   - A `when` or a condition may read `this.<field>`, or follow up to two links, as in `this.program.end_date`.
   - Inside a selector, `outer` names the record of the stage, check or counter that uses it.
   - `first` takes the earliest or latest date of a field over the records a selector finds.
   - `today` is the person's calendar day.
5. **Conditions.** There is a closed list: in, present, on_or_before, on_or_after, before, after, level_above, level_same, level_below, same_as, differs_from, month_day_is, at_most, exists, none, count_below, count_at_most, any_of, all_of, not. Each reads fields and rule amounts, never a literal number.
6. **Three answers.** A condition is true, false or unknown. It is unknown when a field it reads is absent or "not sure".
   - A missing field is asked, and the verdict is cannot_tell until it is answered.
   - "Not sure" gives the judgement item `<record id>.<field>.not_sure` (talk_to_dso).
   - A step whose condition is unknown is never shown as if it were open, and never hidden as if it were closed. Its dates are shown with the line "Whether this step is open to you is a question for your DSO."
7. **Next, with conditions.** A `next` entry may carry `only_if` and `bind`. The next stage's windows are computed for a record not yet entered, and `bind` sets that record's fields from this one: an OPT for this program, or a STEM extension of this OPT.
8. **A second source for an end.** `span.ends_also` holds other readings of a span's end, each with its rules. When they differ, section 11 applies.
9. **More kinds of date.**
   - In earliest_of and latest_of, a member marked `optional` is skipped when its fact is absent. Any other absent member makes the date missing.
   - `as_of` reads a field with history as it stood on a given day.
   - `in_fiscal_year_of` places a month and day in the fiscal year that holds a date. The fiscal year's first day comes from a rule (J12).
   - `day_before` and `day_after` move a date by one calendar day. They are not amounts (J08, J15).
10. **Checks.** `path.checks` declares each check on the student's own dates and answers: a condition that should hold, the rules behind it, and when it applies.
    - When it does not hold, it works like a conflict in product-1 section 1. The question is "Are these the dates on your documents?", and a yes gives talk_to_dso with the judgement item.
    - A check marked `judgement` goes to the DSO at once.
    - This is how every "within N days or months" rule on a person's dates is checked. Duly never says a step was late.
11. **Counters.** There are four calculators. Each runs over a `scope`: the records it counts, grouped by record, by chain (a record and those that link to it), by a shared value such as a level, or all together.
    - `days_without_qualifying_period` is today's unemployment count, over each group's span. A day counts unless a qualifying record covers it. Days of a `not_qualifying` record count even when covered.
    - `sum_of_days` counts calendar days of the matching spans, first and last day included, each day once where spans overlap.
    - `sum_of_months` measures each span as whole months from its start plus days, then adds them up. The total is over a limit when its months pass the limit, or equal it with days left over.
    - `count_of_records` counts records.

    Each counter names a limit rule. At or over the limit, the verdict carries `<counter>.at_or_over_limit.<group>` (talk_to_dso). How days and months are counted is Duly's reading, and the item says so. `days_in_status` and `count_of_facts` leave the contract, because nothing defines them.
12. **Years.** The unit list gains `years`, for "within the 10 years preceding" (J02). Adding years moves the calendar date, and 29 February becomes 28 February, as month ends do today. That is a reading.
13. **Where a start date comes from.** A rule row gains `effective_from_basis`: `stated`, or `earliest_saved_copy` when the start is only the date of the oldest saved copy. For such a row, an event before that day gives `rule_copy_not_saved_for_event_day`: "Duly has no saved copy of this rule from before <date>. The question is for your DSO." Duly never says the rule was not yet in force (J01, J04, J06, J07, J14, J15).

## 14. The F-1 path over records (L-content)

Write F-1's path in rulepacks/f1-us/v2026.09/parameters.yaml as below. Every amount names a rule from section 15 or 16.

| Stage, for each | Span | Windows and checks | Next, only if |
|---|---|---|---|
| program, where us_on_f1 | start_date to end_date in force | Check: an OPT card does not start more than `product.opt_start_earliest_years_before_program_end` before its own program's end. Check: a program in_progress has an end date on or after today | opt_post bound to this program, only if: level is associate or above (not secondary or language_training); no post-completion OPT rests on it; months at this level are below `opt.max_months`; state is not left_before_completing |
| move | release_date or i20_issued_on | Contact the new DSO by to_program.start_date plus `transfer.contact_new_dso_within_days`. Classes begin by the earlier of (release date, from-program end date in force) plus `transfer.begin_within_months`. With post-completion OPT, the earlier of (release date, the OPT's end) plus `transfer.opt_resume_within_months`. A check for each. On-campus work at the from-school ends by the release date | |
| end_date_change | | Check: an extension was asked for on or before old_end | |
| cpt | card_start to card_end | Checks: it starts on or after dso_on; first_year_before_training is yes, unless immediate_cpt is yes at a graduate level | |
| opt_pre | card_start to card_end | Filing opens at first_year_done_on minus `opt.pre_completion_file_before_days`. Checks: it starts on or after first_year_done_on; it ends on or before the program end; when part_time, work under it is at most `opt.pre_completion_in_session_hours` | |
| opt_post | card_start to its end (section 11) | Today's windows (apply opens and closes, latest start, file by, complete by), counted from the program end date in force on filed_on. Checks: filed inside the window, now on both sides because the type is stated; the card fits `opt.max_months`; the card starts after the program end | stem bound to extend it, only if: a candidate basis exists; STEM authorizations so far are below `stem.max_lifetime_extensions`; for a second one, its basis level is above the first's |
| stem | card_start to its end | Validations, evaluations, new plans, concluding evaluations and reports as today, dated only inside the span. Checks: it extends a post-completion OPT; it was filed while that OPT or its cap-gap was in force; the basis rules below | |
| cap_gap, for each petition with change_of_status yes | the day after the last card's end | Ends at the earliest of: April 1 in the fiscal year of requested_start; validity_start (optional); outcome_on when the outcome is rejected, denied, revoked or withdrawn (optional); cos_ended_on (optional). Rows are looked up for filed_on. Check (judgement): a trip while the change of status is pending | |
| grace, for each completed program that no move leaves | the latest end of the program, its cards and its cap-gap | That end plus `grace.after_completion_days`. Not computed after a cap-gap that an outcome ended: step back to the DSO | |
| withdrawal | | dso_authorized yes: `on` plus `grace.withdrawal_days`. Otherwise step back | |
| trip | left_on to returned_on | Checks: back within `travel.absence_months`; inside post-completion OPT or STEM, signature_on is within `travel.opt_signature_months` before the return; job_on_return is yes (judgement); after a move's told_school_on, reentry_i20 is the new program's | |

A program is a candidate basis for a STEM extension when all of these hold:

- `where` is us_on_f1 or us_other_status;
- `level` is bachelor, master or doctorate;
- `stem_list` is on_list;
- it is the OPT's own program, or it meets both of these:
  - it was conferred before the OPT's program was done (`stem.requires.previously_obtained_degree`, `stem.later_degree_not_basis`);
  - conferred_on is on or after the STEM window's opening, minus `stem.file_within_days_of_recommendation`, minus `stem.previous_degree_within_years`. This is the earliest day the DSO's recommendation could fall, moved back 10 years.

Duly also shows `stem.basis_ten_years_end.<program>`, the conferral date plus 10 years. Its last day is marked as Duly's reading.

Counters:

| id | Calculator | Scope | Limit |
|---|---|---|---|
| unemployment.opt_card | days_without_qualifying_period | each opt_post: its span, extended by its cap-gap | opt.unemployment_limit_days |
| unemployment.total | same | chain: an opt_post and the stem that extend it | stem.unemployment_limit_days, only when a STEM card is in the chain |
| cpt.full_time_days_at_level | sum_of_days | full_time cpt, grouped by program level | cpt.full_time_bar_days, compared for a level that has a post-completion OPT or one next |
| cpt.full_time_months_at_level | sum_of_months | same | cpt.full_time_months_bar. When the two CPT counts disagree on the bar, the verdict steps back (J06) |
| opt.months_at_level | sum_of_months | approved opt_pre and opt_post, grouped by program level | opt.max_months. A part_time opt_pre in the group makes the count null, with a step back (IMPL-017) |
| stem.extensions | count_of_records | pending or approved stem_extension, all | stem.max_lifetime_extensions |

In both unemployment counters, a day qualifies when work under the group's authorizations covers it at or over the hours rule. Trip days with purpose personal or study_abroad do not qualify. A trip whose purpose is "not sure" makes the count unknown.

For enrollment, each program has `full_course_each_term` and `online_within_limit`. "No" or "not sure" gives the judgement item `<program>.enrollment` (talk_to_dso), with a drafted question. Duly does not check terms in this round (section 20).

Here is how the opt_post stage is written. It is abridged, but it validates against the Part 2 schema.

```yaml
- id: opt_post
  label: "Post-completion OPT"
  for_each: {record: authorization, where: [{field: this.type, in: [opt_post_completion]}]}
  entered_when: [this.card_start, this.card_end]
  rule_ids: [opt.post_completion_definition]
  span:
    starts: {fact: this.card_start}
    ends:
      earliest_of:
        - {fact: this.card_end}
        - {optional: true, first: {of: {record: move, where: [{field: this.from_program, same_as: outer.program}]}, field: release_date, pick: earliest}}
        - {optional: true, day_before: true, first: {of: {record: move, where: [{field: this.from_program, same_as: outer.program}, {field: this.to_program.level, differs_from: outer.program.level}]}, field: to_program.start_date, pick: earliest}}
    ends_also:
      - when: {earliest_of: [{fact: this.card_end}, {optional: true, first: {of: {record: move, where: [{field: this.from_program, same_as: outer.program}]}, field: release_date, pick: earliest}}]}
        rule_ids: [opt.ends_on_release_date]
  windows:
    - id: opt.apply_window
      label: "Filing window for Form I-765"
      opens: {fact: this.program.end_date, as_of: {fact: this.filed_on}, add: [{rule: opt.apply_before_days, sign: -1}]}
      closes: {fact: this.program.end_date, as_of: {fact: this.filed_on}, add: [{rule: opt.apply_after_days}]}
      rule_ids: [opt.apply_before_days, opt.apply_after_days]
      done_when: [this.filed_on, this.card_start]
  next:
    - stage: stem
      bind: {extends: outer.id}
      only_if:
        - exists: {record: program, where: [{field: this.stem_list, in: [on_list]}]}   # abridged: section 14's full test
        - count_below: {of: {record: authorization, where: [{field: this.type, in: [stem_extension]}]}, rule: stem.max_lifetime_extensions}
```

## 15. Every rule in the pack and the facts it reads (L-content)

| Rule | Reads | For each |
|---|---|---|
| opt.apply_before_days | the end_date in force on filed_on of the program the OPT rests on | opt_post, and each program as a next step |
| opt.apply_after_days (both regimes) | same; the row in force on that end date | same |
| opt.latest_start_after_days (both regimes) | same | same |
| opt.file_within_days_of_recommendation | dso_on, filed_on | opt_post |
| opt.max_months | card_start and card_end of each opt_pre and opt_post, by program level | each card; each level |
| opt.complete_within_months | program end_date in force (Duly's reading of "completion of study") and the OPT's end | opt_post |
| opt.post_completion_definition | type, card dates, program end_date | opt_pre, opt_post |
| opt.unemployment_limit_days | work under the card, its hours, trips; the card's span with its cap-gap | opt_post |
| opt.min_hours_per_week | hours of work under the card | opt_post |
| opt.report_employer_within_days | end of work under an opt_post; report records | work |
| opt.report_interruption | same, plus trips with job_on_return | work |
| stem.unemployment_limit_days | as opt.unemployment_limit_days, over the chain | chain with STEM |
| stem.extension_months | STEM card dates | stem |
| stem.apply_before_expiry_days | the end (section 11) of the authorization it extends | opt_post as a next step; stem (check filed_on) |
| stem.apply_window_closes_rule | same, or the cap-gap end | same |
| stem.file_within_days_of_recommendation | dso_on, filed_on | stem |
| stem.min_hours_per_week | hours_per_week and hours_changes of work under the card | stem |
| stem.validation_interval_months | card_start and the stem's end | stem |
| stem.validation_due_business_days | validation dates; report records | stem |
| stem.evaluation_interval_months | card_start | stem |
| stem.evaluation_due_days | card_start, each work end under the card, the stem's end; report records | stem, work |
| stem.new_plan_due_days | start and employer of each work under the card | work |
| stem.report_change_within_days | end and employer of work under the card, also during its cap-gap | work |
| stem.reporting_required | report records and answers to `.made` | each STEM duty |
| stem.requires_post_completion_opt | extends; filed_on against that span and its cap-gap | stem |
| stem.requires.all_of_the_following | nothing: it is the list | STEM next step |
| stem.requires.accreditation | basis_program.where (outside_us ends the candidate). Accreditation itself is never computed | basis |
| stem.requires.dhs_approved_degree | basis_program.level, stem_list | basis |
| stem.requires.degree_on_designated_list | basis_program.stem_list, as the student stated it (the list is not saved) | basis |
| stem.requires.previously_obtained_degree | basis_program, extends.program, conferred_on, where; with stem.previous_degree_within_years | basis other than the OPT's program |
| stem.requires.eligible_practical_training_opportunity | nothing: listed, never computed | list |
| stem.requires.employer_qualification | employer.e_verify of the job under the card | stem, next step |
| stem.requires.employer_reporting | nothing: listed | list |
| stem.requires.training_plan | an i983_new report made on or before the stem's dso_on (checked when both are entered) | stem |
| stem.requires.duties_hours_and_compensation | listed | list |
| stem.requires.self_evaluation | listed | list |
| stem.requires.employer_attestation | listed | list |
| stem.requires.employer_attests_resources | listed | list |
| stem.requires.employer_attests_no_replacement | listed | list |
| stem.requires.employer_attests_training_goals | listed | list |
| cpt.full_time_months_bar | full_time cpt spans, by level | level |
| cpt.full_time_bar_days | same | level |
| grace.after_completion_days (both regimes) | end_date, state, the ends of the program's cards and cap-gap, moves out of it | completed program that no move leaves |
| capgap.end_month_day (both rows) | filed_on (for the row), requested_start (fiscal year), validity_start (2025 row) | petition |
| capgap.fiscal_year_start_month_day | requested_start | petition |
| capgap.october_start_condition (both rows) | requested_start (month_day_is), filed_on (for the row) | petition filed before 2025-01-17 |
| calendar.federal_holidays_law | each business day counted | each business-day count |
| product.opt_start_earliest_years_before_program_end (a setting, not law) | each OPT card's start and its own program's end | each OPT card |

## 16. Rules to add (L-content, before the path is written)

Each rule is in a saved copy under rulepacks/f1-us/v2026.09/sources/, and we read each one on 2026-09-29. The words below are only for finding the rule. The lane copies each quote from the saved copy, checks the 2026-09-14 and 2026-09-15 texts for both regimes, and writes plain words under plain-1. A value here is a claim to check, never a fact to copy.

| id | Value | Status, derivation | Source | Words |
|---|---|---|---|---|
| levels.higher_order | flag | guidance, reading | SEVP OPT page; (f)(6)(ii) | "Twelve months of Regular OPT is available for each higher level of study", with its bachelor's then master's example. The full order is Duly's reading |
| practical_training.one_academic_year | flag | settled | (f)(10) | "lawfully enrolled on a full-time basis, in an approved SEVP-certified college, university, conservatory, or seminary for one full academic year" |
| practical_training.study_abroad | flag | settled | (f)(10) | "at least one full academic term enrolled in a full course of study in the United States prior to studying abroad" |
| practical_training.language_programs | flag | settled | (f)(10) | "Students in English language training programs are ineligible for practical training." |
| cpt.graduate_immediate | flag | settled | (f)(10)(i) | "Exceptions to the one academic year requirement are provided for students enrolled in graduate studies that require immediate participation" |
| cpt.after_endorsed_i20 | flag | settled | (f)(10)(i) | "A student may begin curricular practical training only after receiving their Form I-20 or successor form with the DSO endorsement." |
| cpt.dso_marks_time | flag | settled | (f)(10)(i) | "The DSO will indicate whether the training is full-time or part-time, the employer and location" |
| cpt.same_level_counts | flag | guidance | SEVP OPT page | "Full-time CPT at a previous school at the same program level counts toward the CPT 12month total affecting OPT. CPT at another program level does not affect OPT." |
| opt.pre_completion_file_before_days | 90 days | settled | (f)(11)(i)(B)(1) | "up to 90 days before being enrolled for one full academic year" |
| opt.pre_completion_in_session_hours | 20 hours_per_week | settled | (f)(10)(ii)(A)(2) | "does not exceed 20 hours a week while school is in session" |
| opt.ends_on_transfer_or_new_level | flag | settled; the transfer day is a reading | (f)(10)(ii)(B) | "automatically terminated when the student transfers to another school or begins study at another educational level" |
| opt.ends_on_release_date | flag | guidance | 1004-03 6.10 | "Any OPT authorization ends on the transfer release date" |
| opt.split_same_level | flag | guidance | SEVP OPT page | "A student can split their OPT time between degree programs at the same education level" |
| opt.unemployment_each_period | flag | guidance, reading | 81 FR 13040 preamble; 1004-03 7.1.4 | "at both educational levels"; "For each new period of post-completion OPT, the student will have the full 90-day period of unemployment." |
| opt.unemployment_abroad | flag | guidance; its use for 150 days is a reading | 1004-03 7.1.8 | "Time spent outside the United States during an approved period of post-completion OPT counts as unemployment" |
| opt.unemployment_in_cap_gap | flag | guidance; its use for 150 days is a reading | 1004-03 9.4.3 | "the 90 day limitation on unemployment continues during the cap gap extension" |
| capgap.travel_while_pending | flag | guidance | 1004-03 9.4.2 | "USCIS will consider a change-of-status application to be abandoned if the applicant leaves the country while the application remains pending" |
| capgap.ends_on_outcome | flag | settled | (f)(5)(vi)(B) | "shall automatically terminate upon the rejection, denial, revocation, or withdrawal of the H-1B petition" |
| stem.max_lifetime_extensions | 2 count | settled | (f)(10)(ii)(C) | "In no event may a student be authorized for more than two lifetime STEM OPT extensions." |
| stem.second_higher_level | flag | settled | (f)(10)(ii)(C) | "must be based on a degree at a higher degree level than the degree that was the basis for the student's first OPT extension" |
| stem.seventeen_month_counts_as_one | flag | settled | (f)(10)(ii)(C) | "is considered to have been authorized for one STEM OPT extension" |
| stem.previous_degree_within_years | 10 years | settled | (f)(10)(ii)(C)(3) | "conferred within the 10 years preceding the date the DSO recommends the student" |
| stem.later_degree_not_basis | flag | guidance, reading | 81 FR 13040 preamble | "the subsequently earned degree would not qualify the student for an extension of his or her current OPT period" |
| stem.pending_card_extended | flag, no length | settled | (f)(11)(i)(C) | "is extended automatically pursuant to the terms and conditions specified in 8 CFR 274a.12(b)(6)(iv)" (274a.12 is not saved) |
| transfer.begin_within_months | 5 months | settled | (f)(8)(i) | "within five months of transferring out of the current school or within 5 months of the program completion date" |
| transfer.opt_resume_within_months | 5 months | settled | (f)(8)(i) | "within 5 months of transferring out of the school that recommended OPT or the date the OPT authorization ends, whichever is earlier" |
| transfer.contact_new_dso_within_days | 15 days | settled | (f)(8)(ii) | "contact the DSO at the transfer-in school within 15 days of the program start date" |
| change_of_level.transfer_procedure | flag | settled | (f)(5)(ii) | "accomplished according to transfer procedures outlined in paragraph (f)(8)" |
| oncampus.school_with_record | flag | settled | (f)(9)(i) | "only engage in on-campus employment at the school having jurisdiction over the student's SEVIS record" |
| oncampus.after_completion | flag | settled | (f)(9)(i) | "may not engage in on-campus employment after completing a course of study" (8 CFR 214.3(k), named beside it, is not saved) |
| program.extension_before_end | flag | settled | (f)(7)(iii) | "A DSO may not grant an extension if the student did not apply for an extension until after the program end date" |
| program.extension_new_i20 | flag | settled | (f)(7)(iv) | "issuing a new Form I-20 or successor form reflecting the current program end date" |
| travel.absence_months | 5 months | settled | (f)(4) | "a temporary absence of five months or less" |
| travel.updated_i20 | flag | settled | (f)(4)(ii) | "An updated Form I-20 or successor form if there has been a substantive change" |
| travel.opt_signature_months | 6 months | settled | (f)(13)(ii) | "endorsed for reentry by the DSO within the last six months" |
| grace.withdrawal_days | 15 days | as grace.after_completion_days, under both regimes | (f)(5)(iv), and (f)(5)(v) in the 2026-09-15 text | "authorized by the DSO to withdraw from classes will be allowed a 15-day period". The 2026-09-15 text words it differently |

## 17. What Duly asks, and never assumes

Duly asks for these:

1. That each list is whole (section 12).
2. Each program's level, as the I-20 shows it. It is never read from a degree's name, and it has no default.
3. Whether a degree is on the STEM Designated Degree Program List. It is never read from a major or a CIP code, because the list is not saved.
4. Whether a program is finished, and the days coursework was done and the degree was conferred.
5. Which program each authorization rests on. The form proposes the one whose dates fit, and the student confirms.
6. Whether an OPT card falls before or after the program end, and whether it is full or part time, as the I-20 shows. Duly then checks this against the dates.
7. Full or part time for each CPT, as the DSO marked it.
8. Which degree a STEM extension rests on.
9. Which permission each job was under, and whether a job is on campus.
10. What each trip abroad was: job travel, approved leave, personal, or a study abroad term.
11. Whether an employer is in E-Verify.
12. How the student moved from one program to the next.
13. Whether a petition is under the yearly cap, and each outcome with its day.
14. When the first full academic year was done, and whether a graduate program requires CPT from the start. These are the school's facts. Duly never computes a school's calendar.
15. Whether the program end date moved, and when the change was asked for.
16. Whether every term was a full course load, and whether online classes stayed within the limit. Duly asks this because it does not check terms yet.

Duly works these out and never asks for them: the level of a card, same or higher level (a reading), the end date in force, the day a move ends OPT, a change of employer, and every count.

## 18. The onboarding, step by step (L-web)

The screens follow the canvas's Onboarding screen (DESIGN-SPEC section 9, ONB-001 to ONB-010):

- a 560px column, the wordmark, and five pips with "Step N of 5";
- one question per screen, each with its why-we-ask line;
- Back and Continue that keep every answer, and buttons that name outcomes;
- nothing preselected (the canvas's "Employee by default" goes, under PRINCIPLES 2);
- no counters, urgency or red, and a quiet ending instead of confetti (D10);
- work type and field move to WorkBook setup (canvas-conflicts row 50).

A choice that allows "I'm not sure" shows it as a quiet link under the cards. That is a third answer, which goes against the canvas rule "two choices, not three". List it in docs/requirements/canvas-conflicts.md, where PRINCIPLES 2 wins (D53).

The order follows the documents a student holds: the current I-20 first, then older I-20s, newest first, then the EAD cards for each program, then everyday facts, then a check of the whole record. A student with one program and no training answers about ten screens. After onboarding, the engine's questions come one at a time in the same style.

**Step 1 of 5: Your program now**

1. "Add your current I-20." Buttons: "Add my I-20", "Type it in". Why: "Your I-20 holds your school, level, field and dates. Duly reads it on this computer, and you check each field before Duly uses it."
2. School name, and the school code if the I-20 shows it.
3. "Your education level, as your I-20 shows it": Associate, Bachelor's, Master's, Doctorate, English language, Other. Why: "Many rules count by level, such as 12 months of OPT at each level."
4. "Your major, as your I-20 shows it," and the CIP code beside it. Why: "Duly does not match your major to any list for you."
5. "Is this degree on the STEM Designated Degree Program List?" Yes, No, or "I'm not sure". Why: "Your DSO can tell you. Duly does not guess it from your major's name."
6. The program start and end dates on this I-20.
7. "Has your DSO changed this program's end date?" If yes, for each change: the earlier date, the day you asked, the day it was granted, and why.
8. "Are you still in this program?" Still studying, or Finished. If finished: the day all course requirements were done, and the conferral day, or "Not conferred yet".
9. "Is this program part of a dual degree?" If yes, the other program, with the same school filled in.
10. "In every term, did you take a full course load, or have your DSO's approval first for a lighter one?" Then: "In every term, was no more than one class, or 3 credits, of your full load online?" Why: "Duly does not check your terms yet. If the answer is no or not sure, Duly drafts a question for your DSO."

**Step 2 of 5: Earlier study**

1. "Before this program, did you study in another program in the US on an F-1?" Why: "Earlier programs decide how much OPT and CPT you have used, and which degrees a STEM extension can rest on."
2. For each earlier program, newest first: questions 2 to 9 of Step 1, from its I-20. Then: "How did you move from <School, level> to <School, level>?" The choices are: "Transferred to another school", "New level at the same school", "Left the US and came back on a new I-20". Then that move's dates: the day you told the school, the release date, the new I-20's date, and the day you contacted the new DSO.
3. "Is that every program you studied in the US on an F-1?" Buttons: "That's every program", "Add another program".
4. "Do you have a degree from a school outside the US, or from a US school while not on an F-1?" If yes: level, field, where, conferral day, and the STEM list question for a US degree. Why: "The rule for a STEM extension names a degree from a U.S. educational institution. Duly asks so it does not assume either way."

**Step 3 of 5: Permission to work**, for each program, newest first

1. "During <program>, did you have CPT?" For each CPT: its dates on the I-20; full or part time, as the DSO marked it; the employer; the day the DSO signed the I-20 for it. If a CPT started early, ask the first-year question, and at graduate level the CPT-from-the-start question.
2. "During or after <program>, did you have OPT?" For each: before or after the program end date (and full or part time, if before); the recommendation date; the filing date; the EAD dates ("Add my EAD card" or "Type the dates"), or the decision so far.
3. "Did you get a STEM extension after this OPT?" For each: its dates, and "Which degree is it based on?", with "I'm not sure" available.
4. When two OPTs share a level: "Did your DSO note in SEVIS that you are splitting OPT between these programs?"
5. "Is that all the CPT and OPT for <program>?"

**Step 4 of 5: Jobs, trips and H-1B**

1. For each job: the employer; the start; the end, or "Still working here"; hours a week, and any change of hours; "Which permission was this job under?" (Duly proposes the card whose dates hold the start, and the student confirms). Ask E-Verify only for a STEM job or step. Then "Is that every job since <first training start>?"
2. "Have you left the US since <the earliest program start>?" For each trip: the day you left; the day you came back, or "Still away"; what it was (job travel, leave your employer approved, personal, a study abroad term); which I-20 you showed; its travel signature date; and whether you had a job to return to.
3. "Has an employer filed an H-1B petition for you?" For each: the filing day; the receipt day; the start day asked for; whether it asks to change status in the US; whether it is under the yearly cap; what has happened with it, and on what day; the approved start; and the day H-1B began.

**Step 5 of 5: Check and finish**

1. The record as a timeline: each program with its training, moves and trips, in order, each date with its source. Buttons: "This is everything", "Change something".
2. Typed dates (D59): "Did you type these dates from your documents?", then each date checked against its document.
3. Time zone, proposed from the computer and confirmed.
4. "You're set.", with the programs, where the record stands, and what Duly watches (from `upcoming`), and "Everything lives in Your case and can be changed any time." Button: "Open Duly".

## 19. The F-1 case of today, translated (L-engine)

POST /v1/compute/f1 and case_f1 stay. compute_f1 translates them into records and calls path.py.

| case_f1 | Records |
|---|---|
| program_end_date, degree_level | p1: where us_on_f1, level, end_date |
| cpt_full_time_days | p1.cpt_days_stated (translation only). The CPT bar reads it only when p1 has no CPT records |
| opt | a1: opt_post_completion, program p1, dso_on, filed_on, card dates; approved when the card dates are present |
| stem | a2: stem_extension, extends a1, basis_program p1 |
| employment[n] | w<n>: under the card that holds its start, hours, end, employer_reported (translation only) |
| cap_gap | h1: filed_on, requested_start, change_of_status, outcome; cap_subject yes, as today's engine reads it |
| confirmations | Same ids. The translation strips the record suffixes. `nothing_more_to_record` and `opt.earlier_at_this_level` stand for the completeness statements they replace |

Parity holds for every item that today's engine computes, except these deliberate changes. Each has its journey and a test.

1. The STEM next step and its list are shown only once p1.stem_list is known. A translated case with OPT and no STEM gains the question `p1.stem_list` (J02, J11, J16, J20).
2. A rule whose start is only its earliest saved copy gives `rule_copy_not_saved_for_event_day` in place of `rule_not_in_force_on_event_day` (section 13, point 13).
3. `record.ends_before_today` is raised where today is past the last span (J04, J10).
4. A petition that is denied, rejected, withdrawn or revoked asks for outcome_on, and states no grace date after it (J13, J14).

## 20. What stays out of the first build, and why

1. **Terms, credits, online classes, reduced course loads and reinstatement.** The records are held, but nothing is computed from them. A full course is the school's number for each level, or what the DSO certifies. School records (D3) do not exist yet. The coverage questions of section 14 send "no" or "not sure" to the DSO.
2. **The part-time pre-completion deduction (1004-03 6.6) and the STEM automatic extension length.** Both stay behind IMPL-017, and 8 CFR 274a.12 is not saved. A level whose count includes a part-time pre-completion card steps back. A pending STEM application after the card ends is a judgement item with no date.
3. **The paused rule's changes to transfer and change of level** (91 FR 44976, (f)(5)(ii)(A) to (C) and (f)(8)). A court paused them, so nothing changes today. The facts they need (level order, completion after 2026-09-15, graduate level) are held, so adding them later is a content change only.
4. **What follows a cap-gap ended by an outcome.** Only a preamble and guidance speak to it, and the pack holds no rule. Duly steps back (IMPL-010).
5. **H-1B after cap-gap.** The H-1B pack is empty. `h1b_began_on` ends the F-1 stages, and the verdict is cannot_tell with `category_not_covered:h1b`.
6. **F-2 dependents** (DEC-D12-015).
7. **Things that are never computed:** whether a job is directly related to a degree; whether a school is accredited and SEVP-certified; whether a CIP code is on the STEM list. These are listed with the regulation's words and the DSO question.
8. **8 CFR 214.3(g)(2)(iii) and 214.3(k).** Neither is saved. Transfer completion and on-campus work under a new program's I-20 go to the DSO.
9. **Hardship and international-organization authorizations.** They are held and shown as entered. No rows exist for them yet.
10. **Reading the new I-20 fields.** documents-1 runs after this round. It adds school, school code, level, major and CIP code, and program start to what it reads, only where the specimen prints them. Its section 6 line "Only one I-20 feeds the case at a time" becomes "each program takes the dates of its own newest I-20; older ones feed its end-date history".
11. **The Timeline and Home reading `record`.** These are built in the desktop round.

## 21. What changes in the parts above

- **The contracts:** contracts/case.schema.json, contracts/rulepack.schema.json, contracts/engine_output.schema.json and contracts/openapi.yaml change as in Part 2. The change lands first and alone, in the founder's lane. POST /v1/compute takes case.schema.json. case_f1 and POST /v1/compute/f1 stay, translated as in section 19.
- **Point 1:** stages are entered once per record. Every entered instance whose span holds today is current. The Timeline's NOW is the one that started last.
- **Point 3:** the windows of `next` follow `only_if` and `bind`.
- **Point 4:** counters follow section 13, point 11.
- **Point 5:** "a period with days outside every span that allows it" now reads a job's own `under` authorization, including its cap-gap. Three kinds are added: declared checks, `record.ends_before_today`, and an end by source.
- **Point 6:** missing fields are named `<record id>.<field>`; the "not sure" answer and list completeness follow sections 12 and 13.
- **Point 7:** the translation carries the differences of section 19.
- **The rules (L-content):** the stage list is section 14. The rules of section 16 are added before the path is written.

## 22. Tests, done, covers

**Tests (L-tests):**

- tests/unit/engine/test_path.py gains, with small packs made in the test: record kinds; for_each; paths; each condition with an unknown answer; next with bind; ends_also; optional members; as_of; the fiscal year; day_before; each kind of check; each calculator and grouping; completeness statements reopening; `record.ends_before_today`; `effective_from_basis`.
- The twenty journeys become cases in tests/holdout, each a pair on either side of the line it turns on. Their dates are claims, checked against the saved words first.
- A property test: no case gives no_open_items while a list it uses has no statement, a condition deciding a shown step is unknown, or a check is open.
- A test that engine/path.py names no kind, field, choice or rule.
- Parity, with the differences of section 19.
- Web tests: every onboarding step has its why line; Back and Continue keep answers; nothing is preselected; a production build does not contain the bench.

**Done:**

1. The offline gates, the hidden tests and the source check pass.
2. The reviewer approves.
3. The auditor rechecks the rows below and reports the share met.

**Covers:** the 13 rows above, plus:

- DEC-D12-005, DEC-D12-006, DEC-D12-007, DEC-D12-008, DEC-D12-009;
- IMPL-010;
- IMPL-003, in part: 15 days after an authorized withdrawal is computed, and "0 after a violation" is never concluded, so it steps back;
- DEC-D09-001;
- ONB-001, ONB-002, ONB-007, ONB-010;
- ONB-009, in part: work and field go to WorkBook setup.

That is 26 of 2456 requirements, about 1 percent.

# Part 2. The contract change

## contracts/case.schema.json (the whole new file)

`school` and `documents_count` leave; documents-1 already removes `documents_count`. `facts` no longer takes periods. `records` and `complete` are new.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://duly.local/contracts/case.schema.json",
  "title": "A case, for any category",
  "description": "What a person entered: facts about the person, and records of what happened, each named by the category's rule pack. The engine reads the pack to know what each fact, record kind and field means, and refuses a record whose kind or field the pack does not declare. A field left out is not known: it is never read as no, none or zero. Dates run from 1950 through 2099. Numbers must be finite; NaN and Infinity are refused before validation.",
  "type": "object",
  "additionalProperties": false,
  "required": ["categories", "time_zone", "facts", "records", "complete"],
  "properties": {
    "categories": {
      "type": "array",
      "items": {"type": "string", "pattern": "^[a-z0-9]+$"},
      "minItems": 1,
      "maxItems": 6,
      "description": "The rule packs that apply, for example f1, then h1b"
    },
    "time_zone": {
      "type": "string",
      "pattern": "^[A-Za-z]+(/[A-Za-z0-9_+-]+){1,2}$|^UTC$",
      "maxLength": 64,
      "description": "The person's own time zone, as an IANA name. Today is the calendar day in this zone."
    },
    "facts": {
      "type": "object",
      "maxProperties": 400,
      "propertyNames": {"pattern": "^[a-z0-9_.]+$"},
      "additionalProperties": {"$ref": "#/$defs/scalar"},
      "description": "Facts about the person as a whole, named by the pack. Anything that can happen more than once is a record, never a fact."
    },
    "records": {
      "type": "array",
      "maxItems": 600,
      "items": {"$ref": "#/$defs/record"},
      "description": "One record for each program, authorization, move, job, trip, petition, report and the rest. Record ids are unique in the case. The pack sets how many of each kind a case may hold."
    },
    "complete": {
      "type": "object",
      "maxProperties": 128,
      "propertyNames": {"pattern": "^[a-z][a-z0-9_]{0,31}(:[a-z]{1,3}[0-9]{1,4})?$"},
      "additionalProperties": {
        "type": "object",
        "additionalProperties": false,
        "required": ["on"],
        "properties": {"on": {"$ref": "#/$defs/date"}, "from": {"$ref": "#/$defs/date"}}
      },
      "description": "The person's statements that a list is whole, each with the day it was given. The key is a record kind, or a kind and the record its items link to: authorization:p2 is every authorization for program p2. For a kind whose list grows with time, a statement covers the days from `from`, when given, through `on`, and no later day."
    },
    "confirmations": {
      "type": "object",
      "maxProperties": 1024,
      "propertyNames": {"pattern": "^[a-z0-9_.:]+$"},
      "additionalProperties": {
        "type": "object",
        "additionalProperties": false,
        "required": ["answer", "on"],
        "properties": {
          "answer": {"type": "boolean"},
          "on": {"$ref": "#/$defs/date"},
          "about": {
            "type": "object",
            "description": "The input values the answer was given for, as the question carried them."
          }
        }
      },
      "description": "The person's own answers to yes or no questions Duly asked, each with the day it was given. A question about a record's field is answered by entering the field, including not_sure where the pack allows it."
    }
  },
  "$defs": {
    "date": {"type": "string", "format": "date", "pattern": "^(19[5-9][0-9]|20[0-9]{2})-[0-9]{2}-[0-9]{2}$"},
    "record_id": {
      "type": "string",
      "pattern": "^[a-z]{1,3}[0-9]{1,4}$",
      "description": "Made on the person's computer: the kind's prefix from the pack, then a number, such as p1, a3, mv1, w12"
    },
    "scalar": {
      "anyOf": [
        {"$ref": "#/$defs/date"},
        {"type": "number", "minimum": 0, "maximum": 100000},
        {"type": "boolean"},
        {"type": "string", "minLength": 1, "maxLength": 120},
        {"type": "null"}
      ]
    },
    "period": {
      "type": "object",
      "additionalProperties": false,
      "required": ["start"],
      "properties": {
        "start": {"$ref": "#/$defs/date"},
        "end": {"anyOf": [{"$ref": "#/$defs/date"}, {"type": "null"}]},
        "hours_per_week": {"type": "number", "minimum": 0, "maximum": 168}
      }
    },
    "record": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "kind", "fields"],
      "properties": {
        "id": {"$ref": "#/$defs/record_id"},
        "category": {
          "type": "string",
          "pattern": "^[a-z0-9]+$",
          "description": "The pack that declares this kind. Absent means the first of categories."
        },
        "kind": {"type": "string", "pattern": "^[a-z][a-z0-9_]{0,31}$"},
        "fields": {
          "type": "object",
          "maxProperties": 40,
          "propertyNames": {"pattern": "^[a-z][a-z0-9_]{0,39}$"},
          "additionalProperties": {
            "anyOf": [
              {"$ref": "#/$defs/scalar"},
              {"type": "array", "maxItems": 24, "items": {"$ref": "#/$defs/period"}}
            ]
          },
          "description": "Values named by the pack's declaration of this kind. A link holds the id of another record in this case. A choice holds one of the pack's values, or not_sure where the pack allows it."
        }
      }
    }
  }
}
```

## contracts/rulepack.schema.json (changes)

`parameters.items.properties`: `unit` gains `years`, and one field is added:

```json
"unit": {"enum": ["days", "business_days", "months", "years", "hours_per_week", "count", "date", "flag"]},
"effective_from_basis": {
  "enum": ["stated", "earliest_saved_copy"],
  "default": "stated",
  "description": "stated: the source names the day the rule took effect. earliest_saved_copy: the day is only the date of the oldest saved copy, and the rule may be older. An event before such a day is never called earlier than the rule."
}
```

`path.properties`: `records`, `order` and `checks` are added, and `counters` is replaced:

```json
"records": {"type": "array", "items": {"$ref": "#/$defs/record_kind"}, "description": "The kinds of record a case may hold for this category, and their fields"},
"order": {"type": "array", "items": {"$ref": "#/$defs/order"}},
"checks": {"type": "array", "items": {"$ref": "#/$defs/check"}, "description": "Tests on the person's own dates and answers. Each works as a conflict or a judgement item"},
"counters": {"type": "array", "items": {"$ref": "#/$defs/counter"}, "description": "Counts that need more than date arithmetic. Each names one of four calculators in the engine, its scope and its limit rule"}
```

`$defs.when.properties`, added. The description now says that `fact` may be a path (`this.<field>`, at most two links) or `today`.

```json
"optional": {"type": "boolean", "default": false, "description": "Inside earliest_of or latest_of: skipped when its fact is absent. Any other absent member makes the date missing"},
"as_of": {"$ref": "#/$defs/when", "description": "Read `fact`, a field with history, as it stood on this day. When this day's own fact is absent, today"},
"in_fiscal_year_of": {"type": "string", "description": "With month_day_rule: the month and day inside the fiscal year that holds this fact's date"},
"fiscal_year_rule": {"type": "string", "description": "A rule holding MM-DD, the first day of a fiscal year"},
"day_before": {"type": "boolean", "description": "The calendar day before. Not an amount"},
"day_after": {"type": "boolean", "description": "The calendar day after. Not an amount"},
"first": {
  "type": "object", "additionalProperties": false, "required": ["of", "field", "pick"],
  "properties": {"of": {"$ref": "#/$defs/selector"}, "field": {"type": "string"}, "pick": {"enum": ["earliest", "latest"]}},
  "description": "The earliest or latest value of a date field over the records a selector finds. None found: absent"
}
```

`$defs.stage.properties`: `for_each` is added, `next` and `lists` are replaced, and `span.properties` gains `ends_also`:

```json
"for_each": {"$ref": "#/$defs/selector", "description": "The stage is entered once for each record the selector finds. Its instance id is <stage id>.<record id>, and every item, question and conflict it raises ends with the record id"},
"next": {"type": "array", "items": {"anyOf": [{"type": "string"}, {"$ref": "#/$defs/next_step"}]}, "description": "Stages that can follow. Their windows are computed and shown as what comes next"},
"lists": {"type": "array", "items": {"anyOf": [{"type": "string"}, {"type": "object", "additionalProperties": false, "required": ["list"], "properties": {"list": {"type": "string"}, "only_if": {"type": "array", "items": {"$ref": "#/$defs/condition"}}}}]}},
"ends_also": {
  "type": "array",
  "items": {"type": "object", "additionalProperties": false, "required": ["when", "rule_ids"], "properties": {"when": {"$ref": "#/$defs/when"}, "rule_ids": {"type": "array", "items": {"type": "string"}, "minItems": 1}}},
  "description": "Other sources for the same end. When one gives a different day, both are shown, the items that use the end are null, and the judgement item <stage id>.end_by_source.<record id> is raised"
}
```

`$defs.fact.properties.kind` gains `number` and `text`. These `$defs` are added:

```json
"record_kind": {
  "type": "object", "additionalProperties": false, "required": ["id", "label", "id_prefix", "fields"],
  "properties": {
    "id": {"type": "string", "pattern": "^[a-z][a-z0-9_]{0,31}$"},
    "label": {"type": "string"},
    "id_prefix": {"type": "string", "pattern": "^[a-z]{1,3}$"},
    "max_records": {"type": "integer", "minimum": 1, "maximum": 200},
    "grows_with_time": {"type": "boolean", "default": false, "description": "A statement that the list is whole covers only the days through its day"},
    "complete_label": {"type": "string", "description": "The question that asks whether the list is whole"},
    "fields": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/record_field"}}
  }
},
"record_field": {
  "type": "object", "additionalProperties": false, "required": ["id", "kind", "label"],
  "properties": {
    "id": {"type": "string", "pattern": "^[a-z][a-z0-9_]{0,39}$"},
    "kind": {"enum": ["date", "count", "number", "flag", "choice", "text", "link", "periods"]},
    "label": {"type": "string", "description": "What the person is asked, in plain words"},
    "choices": {"type": "array", "items": {"type": "string", "pattern": "^[a-z0-9_]+$"}, "minItems": 2},
    "not_sure": {"type": "boolean", "default": false, "description": "not_sure is an answer to this choice"},
    "to": {"type": "array", "items": {"type": "string"}, "minItems": 1, "description": "For a link: the record kinds it may name"},
    "pattern": {"type": "string"},
    "max_length": {"type": "integer", "minimum": 1, "maximum": 120},
    "happened": {"type": "boolean", "default": false},
    "school": {"type": "boolean", "default": false},
    "translation_only": {"type": "boolean", "default": false, "description": "Filled only by the translation of an older case. No form asks for it"},
    "history": {"$ref": "#/$defs/history"}
  }
},
"history": {
  "type": "object", "additionalProperties": false, "required": ["record", "link", "old", "new", "from"],
  "properties": {
    "record": {"type": "string", "description": "The record kind that changes this field"},
    "link": {"type": "string", "description": "Its field naming the record changed"},
    "old": {"type": "string"}, "new": {"type": "string"},
    "from": {"type": "string", "description": "Its date field from which the new value holds"}
  }
},
"order": {
  "type": "object", "additionalProperties": false, "required": ["record", "field", "ascending", "rule_ids"],
  "properties": {
    "record": {"type": "string"}, "field": {"type": "string"},
    "ascending": {"type": "array", "items": {"type": "string"}, "minItems": 2},
    "rule_ids": {"type": "array", "items": {"type": "string"}, "minItems": 1}
  },
  "description": "One field's choices from lowest to highest. A comparison with a value not listed is unknown"
},
"selector": {
  "type": "object", "additionalProperties": false, "required": ["record"],
  "properties": {"record": {"type": "string"}, "where": {"type": "array", "items": {"$ref": "#/$defs/condition"}}},
  "description": "The records of one kind for which every condition is true. Inside, this is the record tested and outer is the record of the stage, check or counter that uses the selector. A record for which a condition is unknown makes the selection unknown"
},
"condition": {
  "type": "object", "additionalProperties": false, "minProperties": 1,
  "properties": {
    "field": {"type": "string", "description": "The path the test reads"},
    "in": {"type": "array", "items": {"type": "string"}, "minItems": 1},
    "present": {"type": "boolean"},
    "on_or_before": {"$ref": "#/$defs/when"}, "on_or_after": {"$ref": "#/$defs/when"},
    "before": {"$ref": "#/$defs/when"}, "after": {"$ref": "#/$defs/when"},
    "level_above": {"type": "string"}, "level_same": {"type": "string"}, "level_below": {"type": "string"},
    "same_as": {"type": "string"}, "differs_from": {"type": "string"},
    "month_day_is": {"type": "string", "description": "A rule holding MM-DD"},
    "at_most": {"$ref": "#/$defs/amount"},
    "exists": {"$ref": "#/$defs/selector"}, "none": {"$ref": "#/$defs/selector"},
    "count_below": {"type": "object", "additionalProperties": false, "required": ["of", "rule"], "properties": {"of": {"$ref": "#/$defs/selector"}, "rule": {"type": "string"}}},
    "count_at_most": {"type": "object", "additionalProperties": false, "required": ["of", "rule"], "properties": {"of": {"$ref": "#/$defs/selector"}, "rule": {"type": "string"}}},
    "any_of": {"type": "array", "items": {"$ref": "#/$defs/condition"}, "minItems": 2},
    "all_of": {"type": "array", "items": {"$ref": "#/$defs/condition"}, "minItems": 2},
    "not": {"$ref": "#/$defs/condition"}
  },
  "description": "One test, true, false or unknown. Unknown when a field it reads is absent or not_sure. A list of conditions holds when all are true. Amounts are rules, never literal numbers"
},
"next_step": {
  "type": "object", "additionalProperties": false, "required": ["stage"],
  "properties": {
    "stage": {"type": "string"},
    "only_if": {"type": "array", "items": {"$ref": "#/$defs/condition"}, "description": "All true: shown. Any false: not shown. Otherwise shown with the line that the question is for the DSO, and what is missing is asked"},
    "bind": {"type": "object", "additionalProperties": {"type": "string"}, "description": "Fields of the record not yet entered that the next stage is computed for, each from a path of this one, such as program: outer.id"}
  }
},
"check": {
  "type": "object", "additionalProperties": false, "required": ["id", "holds", "rule_ids"],
  "properties": {
    "id": {"type": "string", "pattern": "^[a-z0-9_.]+$"},
    "for_each": {"$ref": "#/$defs/selector"},
    "only_if": {"type": "array", "items": {"$ref": "#/$defs/condition"}},
    "holds": {"type": "array", "items": {"$ref": "#/$defs/condition"}, "minItems": 1},
    "kind": {"enum": ["conflict", "judgement"], "default": "conflict"},
    "rule_ids": {"type": "array", "items": {"type": "string"}, "minItems": 1}
  },
  "description": "False: a conflict asks whether these are the dates on the person's documents, and a yes gives talk_to_dso; a judgement gives talk_to_dso at once. Unknown: what is missing is asked"
},
"counter": {
  "type": "object", "additionalProperties": false, "required": ["id", "calculator", "scope", "limit_rule", "rule_ids"],
  "properties": {
    "id": {"type": "string", "pattern": "^[a-z0-9_.]+$"},
    "calculator": {"enum": ["days_without_qualifying_period", "sum_of_days", "sum_of_months", "count_of_records"]},
    "scope": {
      "type": "object", "additionalProperties": false, "required": ["of", "group"],
      "properties": {
        "of": {"$ref": "#/$defs/selector"},
        "group": {"enum": ["record", "chain", "same_value", "all"]},
        "chain_link": {"type": "string", "description": "For chain: the field by which a later record names the first"},
        "value_of": {"type": "string", "description": "For same_value: the path whose value groups the records, such as this.program.level"}
      }
    },
    "span": {"type": "object", "additionalProperties": false, "required": ["starts", "ends"], "properties": {"starts": {"$ref": "#/$defs/when"}, "ends": {"$ref": "#/$defs/when"}}, "description": "For sum_of_days and sum_of_months, each record's span. For days_without_qualifying_period, each group's counting window"},
    "qualifying": {"$ref": "#/$defs/selector"},
    "hours_rule": {"type": "string"},
    "not_qualifying": {"$ref": "#/$defs/selector", "description": "Records whose days are counted even when a qualifying record covers them"},
    "only_if": {"type": "array", "items": {"$ref": "#/$defs/condition"}},
    "limit_rule": {"type": "string"},
    "rule_ids": {"type": "array", "items": {"type": "string"}, "minItems": 1}
  }
}
```

## contracts/engine_output.schema.json and contracts/openapi.yaml

- The items of `computed`, `questions`, `upcoming` and `lists` each gain an optional `"record": {"type": "string", "pattern": "^[a-z]{1,3}[0-9]{1,4}$", "description": "The record this belongs to"}`.
- openapi.yaml gains POST /v1/compute, which takes case.schema.json and returns the engine output. /v1/compute/f1 stays.

## J01 as a case under the new contract

Fields the journey does not give are left out. They are not known.

```json
{
  "categories": ["f1"], "time_zone": "America/New_York", "facts": {},
  "records": [
    {"id": "p1", "kind": "program", "fields": {"where": "us_on_f1", "school_name": "School A", "level": "bachelor", "field_name": "Economics", "stem_list": "not_on_list", "start_date": "2019-08-26", "end_date": "2023-05-12", "state": "completed", "conferred_on": "2023-05-20"}},
    {"id": "p2", "kind": "program", "fields": {"where": "us_on_f1", "school_name": "School B", "level": "master", "field_name": "Computer Science", "stem_list": "on_list", "start_date": "2024-08-26", "end_date": "2026-05-15", "state": "completed"}},
    {"id": "mv1", "kind": "move", "fields": {"how": "transfer", "from_program": "p1", "to_program": "p2", "release_date": "2024-07-15"}},
    {"id": "a1", "kind": "authorization", "fields": {"type": "opt_post_completion", "program": "p1", "dso_on": "2023-03-01", "filed_on": "2023-03-10", "decision": "approved", "card_start": "2023-06-19", "card_end": "2024-06-18"}},
    {"id": "a2", "kind": "authorization", "fields": {"type": "opt_post_completion", "program": "p2", "decision": "approved", "card_start": "2026-06-15", "card_end": "2027-06-14"}}
  ],
  "complete": {"program": {"on": "2026-09-29"}, "authorization:p1": {"on": "2026-09-29"}, "authorization:p2": {"on": "2026-09-29"}, "move": {"on": "2026-09-29"}},
  "confirmations": {}
}
```

# Part 3. The twenty journeys and what each needs

| Journey | What the record holds | What Duly works out and checks, and the rules added | First build |
|---|---|---|---|
| J01 BS then MS, OPT after each, transfer in grace | program ×2 (level, stem_list, conferred_on); move transfer (release_date, i20_issued_on, contacted_new_dso_on); opt_post ×2, each linked to its program; work linked to its card; employer.e_verify | An unemployment count for each card (49 and 47 kept apart); months at each level; the OPT end by source; classes within 5 months of the earlier of the release date and the OPT end; contact within 15 days; no STEM step after a1. Rules: transfer.*, opt.ends_on_*, opt.unemployment_each_period | Computed |
| J02 STEM on an earlier US BS, inside and outside 10 years | program ×2 (BS: where, level, stem_list, conferred_on; MBA not_on_list); opt_post on the MBA; stem with basis_program and extends; report i983_new; employer.e_verify | Candidate basis with the 10-year test and the conferral plus 10 years item; lifetime STEM count; second extension higher level. Rules: stem.previous_degree_within_years (years), stem.max_lifetime_extensions, stem.second_higher_level, stem.seventeen_month_counts_as_one | Computed. The STEM list stays the student's answer |
| J03 Second master's, OPT split | program ×2 at master; opt_post ×2 (split_noted); cpt ×2 full_time with dates and school; move transfer | Months at the master level (6 plus 6); full-time CPT across schools (171); unemployment for each period; STEM next only while months at the level fit. Rules: opt.split_same_level, cpt.same_level_counts, cpt.dso_marks_time | Computed |
| J04 PhD after MS: STEM cut by transfer, extension, second STEM | program ×2 (MS on_list; PhD coursework_done_on); end_date_change (old_end, new_end, requested_on, granted_on, reason); move transfer; opt_post and stem on the MS; cpt on the PhD | STEM end at the release date by source; reports dated only to that end; extensions 1 of 2; level_above for the second; extension asked before the old end; no grace for an enrolled student. Rules: program.extension_*, stem.max_lifetime_extensions, stem.second_higher_level, opt.ends_on_* | Computed. The thesis-only pre-completion choice (1004-03 6.7) goes to the DSO |
| J05 Pre-completion OPT full then part time, then post | program (start_date, first_year_done_on); opt_pre ×2 (time); opt_post; work under each card | Pre-completion filing window; starts after the first year and ends by the program end; part-time hours; months at the level. Rules: opt.pre_completion_*, practical_training.one_academic_year | Held and checked. Months at the level step back while a part-time card is in it (IMPL-017) |
| J06 Full-time CPT near one year, part-time CPT apart | program (start_date, first_year_before_training, immediate_cpt); cpt ×5 (time, employer, dso_on, dates, one of them planned); employer ×2; an earlier program at another level | Full-time days and months at the level (both readings, and a step back where they disagree); days left and the last day under Duly's count; starts after dso_on and after the first year. Rules: cpt.after_endorsed_i20, cpt.dso_marks_time, cpt.graduate_immediate, cpt.same_level_counts | Computed |
| J07 Mid-bachelor's transfer, summer abroad, CPT at both | program ×2 (A left_before_completing, B); move transfer (all dates); trip (reentry_i20); on-campus work at A; cpt ×2 | Classes within 5 months; contact within 15 days; on-campus work at A ends by the release date; re-entry on B's I-20; CPT at the bachelor level is 164. Rules: transfer.*, oncampus.school_with_record, travel.updated_i20, travel.absence_months | Computed. Whether A's year counts at B goes to the DSO |
| J08 Change of level at the same school while on OPT | program ×2 (BS on_list, MS); move change_of_level; opt_post on the BS; on-campus work at the MS (the research assistantship); trip | OPT ends the day before the MS start (regulation) and on the release date (guidance), both shown; unemployment only through that end (35 days); no grace; a STEM basis from either degree. Rules: opt.ends_on_*, change_of_level.transfer_procedure, oncampus.after_completion, travel.updated_i20 | Computed, using `day_before` |
| J09 Program extension on time and late | program end_date with end_date_change history; opt_post; reinstatement (late variant) | Windows from the end date in force on filed_on; extension asked by the old end; a filing under an older end checked against that end; a program past its end date; `record.ends_before_today`. Rules: program.extension_* | Computed. Reinstatement is held, and any reinstatement record steps back |
| J10 Gap between programs, three cases | program ×2; move (transfer, change_of_level or new_initial_i20); trip; on-campus work | Classes within 5 months of the earlier of the release date and the MS end; contact within 15 days; no grace when a move follows; Case B raises `record.ends_before_today`; OPT dates not listed without OPT. Rules: transfer.*, oncampus.after_completion, travel.absence_months | Computed. The (f)(5)(iii) vacation reading and 214.3(k) go to the DSO |
| J11 Travel on OPT | program not_on_list; opt_post; work; trip ×3 (purpose, signature_on, reentry_i20, job_on_return); report interruption_report | Personal trip days counted and approved-leave days not; back within 5 months; signature within 6 months; job on return as a judgement; no STEM step. Rules: opt.unemployment_abroad, travel.absence_months, travel.opt_signature_months | Computed |
| J12 Cap-gap, petition approved | petition (cap_subject, receipt_on, outcome approved, outcome_on, validity_start, h1b_began_on); trip in cap-gap; employer | Cap-gap end is the earlier of April 1 in the fiscal year and validity_start; pending past October 1 reaches April 1 of the fiscal year; unemployment counted in cap-gap; a trip while the change of status is pending; H-1B start ends the F-1 stages. Rules: capgap.ends_on_outcome, opt.unemployment_in_cap_gap, capgap.travel_while_pending | Computed to the H-1B start. H-1B itself is not covered |
| J13 Cap-gap, petition denied | petition outcome and outcome_on | Cap-gap ends on outcome_on; work through it is inside the span; no grace date after it; a petition pending on April 1 ends there. Rule: capgap.ends_on_outcome | Computed to the cap-gap end. What follows goes to the DSO |
| J14 Cap-gap on STEM, petition withdrawn, consular switch | petition (outcome withdrawn, outcome_on, cos_ended_on); stem; work with employer; report evaluation_final, change_report | Cap-gap ends at cos_ended_on; concluding evaluation from the job's end; the STEM ten-day rule for work under the STEM card, including during cap-gap; cap-gap unemployment (150, a reading). Rules: capgap.ends_on_outcome, opt.unemployment_in_cap_gap | Computed. Grace after a withdrawal goes to the DSO |
| J15 Unemployment across OPT and STEM, pending STEM, hours cut | stem (decision pending, filed_on, decided_on); employer ×3 (e_verify); work with hours_changes; reports made_on | New Form I-983 from the employer link, not asked; hours changes create no ends; a pending STEM after the OPT card is a judgement with no date. Rule: stem.pending_card_extended | Computed. The 180 days stay behind IMPL-017; (C)(9)(ii) waits |
| J16 Foreign BS, US MBA, CPT, study abroad | program ×2 (BS outside_us, conferred_on; MBA not_on_list, start_date); cpt; opt_post; trip study_abroad (reentry_i20, signature_on) | No candidate basis, so no STEM step; CPT after the first year; a study-abroad term before the first full term goes to the DSO; no default level. Rules: practical_training.*, travel.* | Computed. H-1B next is not covered |
| J17 Online limit, final-term online class | program (full_course_each_term, online_within_limit); term records (credits, online_credits); reduced_load (final term) | The coverage answers step back; nothing is computed from terms | Held. The (f)(6) rules wait for school records (D3) |
| J18 Reduced course loads, extension, unapproved drop | program with end_date_change (reason); reduced_load ×3 (reason, approved_on, credits, resumed_on); term; reinstatement | End-date history as in J09; the coverage answer steps back | Held. The medical aggregate (sum_of_months by level, already in the contract) waits for (f)(6)(iii) rows |
| J19 English language, associate, bachelor's | program ×3 (language_training, associate, bachelor); move ×2 transfer; opt_post and stem on the BS (basis_program) | No OPT next for a language program; associate-level months at 0; associate below bachelor (a reading); the STEM basis tied to the BS. Rules: practical_training.language_programs, levels.higher_order, transfer.* | Computed |
| J20 Dual degree MBA and MS CS, OPT on the MBA | program ×2 at master (dual_with, each end_date and coursework_done_on; MS on_list); opt_post on the MBA | The MS, done after the MBA's OPT began, is not a candidate basis; master's months used, so no new OPT next; an OPT filed before its window opens is now checked, because the type is stated. Rules: stem.later_degree_not_basis, opt.split_same_level | Computed. Which end date SEVIS holds for each degree goes to the DSO |

I did not change anything in the repository. I checked the three drafts with the repo's jsonschema 4.26.0: the new case contract validates, J01 validates against it, and the opt_post path fragment validates against the changed rule pack contract. The same check refuses a literal number where a rule is required. I read every quote in Part 1 section 16 in the saved copies under /Users/ani/Desktop/Duly/duly-founder/rulepacks/f1-us/v2026.09/sources/.

Files are in /tmp/duly_model:
- case.schema.json
- rulepack.schema.json
- path_fragment.yaml
- j01.json