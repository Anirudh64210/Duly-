# Map: asking

Made by the SPEC-W2-UNKNOWN design workflow on 2026-10-02 from the engine at that time (read only).

# How Duly turns an unknown into a question, and where it fails: branch step-w at 07196cd (W2-P1 third review, 5e76463 engine)

The engine only asks about an unknown when a function records it in a `_Trace`. Many paths drop the trace, read the raw value, or fall back to a default. Below: 15 shown outputs that rest on an unknown, 6 unknowns that are never asked, and a quiet verdict reached over a gap. Each was run on the shipped pack, today 2026-09-29, with every list stated whole (probes in /tmp/dulymap/p1.py to p11.py). Line numbers are in /Users/ani/Desktop/Duly/duly/engine/path.py unless named.

## How it works now
- **`_Trace`** (99-119) holds `missing` and `unsure` as (field, record) pairs, plus lapsed rules and `differ`.
- **`_read`** (234-246) adds ABSENT or None to `missing` and `not_sure` to `unsure`. Only conditions that go through `_read` leave a trace.
- **`_need`** (577-588) turns a trace into output:
  - `missing` becomes the reason `missing:` plus a question with `record`.
  - `unsure` becomes the judgement `<field>.not_sure`, with no question.
  - `lapsed` becomes a judgement.
- **`_conflict`** (607-613) gives the reason `conflict:` plus a question.
- **`ask_unreadable`** (168-182) covers date and choice fields only. It treats `not_sure` as readable for every field, whatever the pack allows.
- **`compute`** (1412-1436) decides the verdict itself; `verdict.decide` is not called (it is used only at engine/f1.py:1687 and api/local_routes.py:100).
  - Reasons `missing:`, `conflict:` and `unconfirmed:` mean cannot_tell.
  - Judgements alone, including every `not_sure`, mean talk_to_dso, not cannot_tell.
- **Outputs**: an item or window that could not be worked has value null. Nothing links it to the question that withholds it (`_item` 865-891, `_window` 847-858). An item worked on a guess carries no mark at all.

## Answers per unknown kind
- **Absent field**: asked only when the read goes through `_read` or `_when` "fact". It is not asked at entered_when/done_when (630-633, 814-817), at `present` (446-449), at `_first` (389-398), at optional members (322), at `as_of` (343) or at history (198-204).
- **Unreadable value**:
  - Asked for dates and choices.
  - Never asked for numbers, links, periods or text.
  - Read as absent by `present`, `_days_of` and `_when` optional members, so outputs are shown on the "absent" guess.
- **Undecided selection**: asked in run_stages and run_checks (decided records kept).
  - Still dropped whole in `exists`/`none`/`count_*` (475-488) and in `_counter` (1100-1103).
  - Read as "none" in `_first` (393) and `_days_without` callers.
  - The undecided record's own stage is withheld with no mark.
- **`not_sure`**: on a choice read through `_read` it gives a judgement and talk_to_dso, with no question.
  - On a date, `_when` (345-349) records nothing.
  - `present`, `entered_when` and `done_when` read it as given.
  - `_days_of` (1250) reads it as "no end".
  - A field the pack does not declare `not_sure: true` for is accepted anyway (178).

## Outputs shown although they rest on an unknown
1. **path.py:322, optional members drop their trace.** `got is None and member.optional and not sub.lapsed: continue` drops a member that is unknown, not only one that is truly absent. Probe p6: OPT a1 for p1 with a change-of-level move m1.
   - Known move: opt_post.a1 is done, ending 2026-08-24, and `unemployment.opt_card.a1` is 85 with no limit day.
   - With m1.from_program absent, m1.to_program absent, or p2.start_date absent or `not_sure`: opt_post.a1 is current to 2027-05-31, the count is 121, the limit day is 2026-08-29, and `at_or_over_limit.a1` is raised.
2. **path.py:389-398, `_first`.** It uses `found or []` and the raw `_resolve`, so records with an unknown field are skipped with no trace. Probe p1, grace for p1 (end 2026-05-15) with OPT a1 to 2027-05-31:
   - Known: grace runs 2027-06-01 to 2027-07-30.
   - With a1.card_end absent, unreadable or `not_sure`, or a1.program absent or dangling: grace shows 2026-05-16 to 2026-07-14 as "done".
   - `record.ends_before_today` is then asked on that guess.
   - With a1.type `not_sure`, which the pack does not allow, the same date appears and a1.type is never asked.
3. **path.py:343, `as_of` falls back to today.** The code is `self._when(w["as_of"], ..., _Trace()) or self.today`. Probe p3: when a1.filed_on is absent, unreadable or `not_sure`, the end date in force today is used instead of the one on the filing day.
   - opt.apply_window is 2026-05-17 to 2026-10-14 instead of 2026-02-14 to 2026-07-14.
   - The same shift hits latest_start, last_day, prepare and complete_by.
   - With `not_sure` nothing is asked.
4. **path.py:198-204, `_as_given` history.** A change whose `granted_on` is absent or `not_sure`, or whose `program` link is absent, is ignored. Probe p3:
   - The same shifted windows appear.
   - A false `conflict:opt_post.filed_in_window.a1` is raised and asked.
   - ec1.granted_on and ec1.program are never asked.
5. **path.py:1249-1252, `_days_of`.** Probe p2:
   - End is read raw. With w1.end `not_sure` or "31/08/2026" the job counts as ongoing: 30 days and no limit day, against 59 and 2026-10-30 when the end is known. `not_sure` raises nothing at all.
   - With start absent or `not_sure`, the job covers no days: 121, limit day 2026-08-29, at_or_over raised. The start is asked or judged, but the count is still shown.
6. **path.py:1222-1225, hours.** Review finding 4 is unchanged.
7. **path.py:1151-1155, `_group_key` same_value.** A record whose group value is unknown drops out of its group, and the other members' count is still shown. Probe p5, two full-time CPT authorizations:
   - Both counted: 393 days, 13 months, both at_or_over judgements.
   - With a2.program absent or dangling: master shows 212 days and 7 months, and the judgements are gone.
8. **path.py:1148-1150, chain (read in the code, not probed).** An absent or dangling `extends` makes the record start its own chain, so unemployment.total is split or dropped.
9. **path.py:446-449, `present`.** Unreadable is read as false (review finding 3) and `not_sure` as true. Neither adds to the trace.
10. **path.py:1155, single-part link reads.** A dangling `under` ("a7") or `on_campus` ("p7") makes the job non-qualifying: 121 days and at_or_over raised (p2). The link is asked elsewhere, but the count is shown.
11. **path.py:814-817, done_when.** `not_sure` counts as done (p4). m1.registered_on `not_sure` removes the move.begin_classes close (2027-02-20) from upcoming, and nothing is asked or judged.
12. **path.py:1666 and 322, release date in the move stage (p4).**
    - m1.release_date `not_sure`: begin_classes closes 2027-05-15 instead of 2027-02-20, and nothing is asked.
    - Unreadable: it is asked, but 2027-05-15 is still shown in upcoming.
13. **path.py:475-488, exists/none/count (review finding 1).** These still go unknown when a decided witness already settles them. `count_below` with chosen at or above the limit is never settled to false.
14. **path.py:1100-1103, `_counter` scope (review finding 2).** Unchanged. Probe p5 shows a2.time `not_sure` removes every CPT count.
15. **path.py:914-917, `_next`.** When only_if is unknown, the next stage is still shown with its dates and no mark.

## Unknowns never asked
1. **path.py:630-633, entered_when absent drops the stage with no question.** Probe p11: an in-progress program with no start_date, everything else answered.
   - The verdict is **no_open_items** with reasons `[]`, and there are no stages.
   - Nine upcoming dates are gone, including the OPT window opening 2027-02-14.
   - This is the quiet state reached over a gap.
2. **path.py:345-349, `_when` fact with `not_sure` records no trace.**
   - p10: p1.start_date `not_sure` leaves the stage unknown, with no question and no judgement.
   - p9: p1.end_date `not_sure` gives talk_to_dso with the reason `p1.end_date.not_sure` and no question. `rule_in_litigation` also drops out because no dated item is left.
3. **path.py:176-182, `_unreadable` scope.**
   - Number, link, periods and text fields are never checked; this matches contracts/case.schema.json:116-136, where a scalar is any string up to 120.
   - `not_sure` is accepted on fields that do not allow it, such as a1.type, a1.card_end and p1.end_date.
4. **path.py:1058-1059, `_check` with holds None and an empty trace raises nothing.** Probe p7: w1.hours_per_week 25 gives `conflict:opt_pre.part_time_hours.w1`. "25" or "twenty-five" gives no conflict, no question and no reason.
5. **path.py:625-628 and 1039-1040, undecided records with an empty trace.**
   - When a where condition is unknown for a reason that leaves no trace (a string number in `at_most`, a `_level` value outside the ranks, `_first` returning None, `not_sure` dates in `_when`), the record is dropped and `_need` asks nothing.
   - That is review M18's gap in general form.
6. **path.py:585-586 with 1427-1430, `not_sure` never blocks.** It becomes a judgement and talk_to_dso, never a question or cannot_tell, even on fields where the pack does not allow `not_sure`.

## Wrong or weak naming
- **path.py:224-226, history.** When the history's old value is absent (ec1.old_end), the question asked is `p1.end_date`, which the person did enter, as well as `ec1.old_end` (p3).
- **Unreadable values are asked as `missing:`.** The reviews already note this.
- **path.py:602, `_answer`.** A confirmation with no `about` (the schema allows it) is read for whatever values now hold, so a past answer to a conflict survives a change of dates.
- **No output names the question that withholds it.** Null items and windows carry no reason or record of the gap. Stages withheld for undecided records leave no trace beyond the question.

## engine/f1.py
I only looked at this briefly. It parses a typed case, requires hours (213), and turns end-before-start into conflicts (1407-1427). I found no comparable silent defaults there.
