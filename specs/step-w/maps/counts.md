# Map: counts

Made by the SPEC-W2-UNKNOWN design workflow on 2026-10-02 from the engine at that time (read only).

The counters and spans in engine/path.py still fall back to guessed values in 24 places. When a record in a counter's scope is undecided, the whole counter disappears. When a single job or trip has an unknown field, the job is counted as no job, or the trip as lasting through the card end. In both cases the count, the limit day and the at-or-over judgement are still shown. The underlying cause is in `_counter` at path.py:1124: it blanks the value only when a list is not stated whole or `only_if` is unknown. Gaps the calculation hits (`gtr.missing` / `gtr.unsure`) are asked about but never blank the value.

Every row below was checked with a probe on step-w HEAD 07196cd, today 2026-09-29, with every list stated whole unless a row says otherwise. Rows marked "code only" were read but not probed. The probes are in /private/var/folders/wr/4yqfch851v90m4n6tc4t7zb00000gn/T/mapc/ (h.py, p1-p9).

**Base case:** master's program p1 ending 2026-05-15; post-completion OPT a1, card 2026-06-01 to 2027-05-31; job w1 under a1 from 2026-07-01 at 40 hours. Base result: `unemployment.opt_card.a1` = 30, `limit_day` null. With no job at all it is 121 and 2026-08-29.

**Columns:** "Asked?" says whether a question or judgement names the gap. "Shown on a guess" says whether a count or date is still shown that depends on the gap.

## Table

| # | Place (path.py unless noted) | Input | What happens | Asked? | Shown on a guess |
|---|---|---|---|---|---|
| 1 | `_unreadable` 176-182 | number, link, count, flag, text or periods field with a bad value | Only dates and choices are checked. `not_sure` is accepted on every field (178), even where the pack does not allow it (work.end, card_end, hours) | no | - |
| 2 | `_days_without` 1222-1225, `_number` 61-64 | hours `"40"`, `"forty"`, `true` | `_number` gives None, then `continue`: the job counts as no job | **no** | 121 / 2026-08-29 / at_or_over (correct: 30 / null) |
| 3 | same | hours missing / `not_sure` | job counts as no job | missing: asked; not_sure: judgement only | 121 / 2026-08-29 / at_or_over |
| 4 | same | second job w2 in June with no hours | w2 counts as no job | asked | 30 shown as known |
| 5 | `_days_without` 1216-1222 (code only) | hours rule has no row in force on today | `hours_limit` is None, so the hours test is skipped and every job qualifies | lapse judgement | count shown |
| 6 | `_days_of` 1249-1252 | job start missing / `not_sure` / `2026-13-40` | empty set: no job | asked or judged | 121 / 2026-08-29 / at_or_over |
| 7 | `_days_of` 1249-1252 | trip `left_on` missing / `not_sure` | empty set: the trip is ignored | asked or judged | 30 (trip days not removed) |
| 8 | `_days_of` 1250 (end read raw: no `_read`, no history) | job end `not_sure` | read as "still working" through the card end | **nothing named** | 30, limit_day null |
| 9 | same | job end `2026-13-40` | read as still working | asked | 30, limit_day null |
| 10 | same | trip `returned_on` missing | read as abroad through the card end | **no** | 90 / 2026-09-29 / at_or_over |
| 11 | same | trip `returned_on` `not_sure` / bad | read as abroad through the card end | judgement only / asked | 90 / 2026-09-29 / at_or_over |
| 12 | `_days_of` 1253-1254 | job end 2026-06-15, before its start 2026-07-01 | empty range: no job, no conflict raised | **no** | 121 / at_or_over |
| 13 | qualifying `same_as` 461-465 (pack 2379) | `under: "a9"` (points at no record) | False, so the job does not qualify | asked (via another path) | 121 / at_or_over |
| 14 | qualifying `present` 446-449 (pack 2379) | `on_campus: "not_sure"` or points at no record | counted as present, so the job is treated as on-campus and excluded | asked | 121 / at_or_over |
| 15 | `_counter` 1100-1103 (review finding 2, still open) | one undecided record in scope: a3 with no type; a CPT with time `not_sure`; a pre-completion OPT with decision `not_sure` | every group of every counter on that scope drops | asked | items vanish (a3: opt_card, opt.months, stem.extensions all gone) |
| 16 | `_group_key` 1151-1155 (same_value) | p2.level missing, p2's CPT 2023-01-01 to 2023-12-31 | key None: the record is dropped from every group | asked | master CPT 181 days / 6 months, no at_or_over (correct: 546 / 18, at_or_over) |
| 17 | `_group_key` 1148-1150 (chain) | `extends` missing or points at no record | the record becomes its own chain | asked | total withheld (no zero) |
| 18 | `_counter` 1106-1107 | authorization list not stated whole | `whole` checks only the qualifying and not_qualifying kinds, never the scope's own kind | complete.authorization asked | `stem.extensions.all` = **0**, CPT 181, opt.months 12, all shown |
| 19 | `_counter` 1122-1141 (code only) | limit rule has no row in force | `over` = False, value shown | lapse judged | count shown, no at_or_over |
| 20 | `_calculate` 1181-1191 | two full-time CPTs, both 2025-01-01 to 2025-06-30 | months are summed (12); days are a union (181) | bars_disagree raised | 12 months and at_or_over on the months bar |
| 21 | `_when` 316-333 (322 throws away the sub-trace) | optional `earliest_of` / `latest_of` member is None because of an undecided selection or an unknown date | the member is skipped; that member's own gap goes unasked | elsewhere only | see collapse C |
| 22 | `_when` 342-343 (as_of) | `as_of` date (a1.filed_on) `not_sure` / bad / missing | `or self.today`; trace discarded | not_sure: judgement only | opt.apply_window.a1 2026-02-14 to 2026-07-14 (correct, with filed 2026-02-01: 2026-09-16 to 2027-02-13) |
| 23 | `_as_given` 201-204 | end_date_change `granted_on` `not_sure` / bad | the change is dropped | **not_sure: nothing**; bad: asked | same wrong window |
| 24 | `_when` fact 344-349 | `not_sure` in a date fact | None, with no unsure trace (only ABSENT/None are traced) | no (unless another path judges it) | null with no reason |
| 25 | `_first` 389-398 | one record in the selection has its date field unknown | dropped from min/max; no trace | **nothing names it** | grace 2027-06-01 to 2027-07-30 from a1, while STEM a2 card_end is `not_sure` (with a2 known: 2029-06-01 to 2029-07-30) |
| 26 | `_cond` at_most 471-474 (pack 2202) | pre-completion OPT job hours `"30"` / `"thirty"` / `true` | `_number` None, check unknown; `_read` returned a value, so nothing is missing | **no** | `conflict:opt_pre.part_time_hours.w7` (raised for 30) disappears |
| 27 | count_below 479-488 (pack 1786; code only) | one undecided STEM authorization | whole selection unknown (review finding 1 class) | asked | STEM stage gate unknown |
| 28 | `_days_without` 1217 / 1223 (code only) | - | `hours_changes` is never read; the hours rule is read for today, not each card's start; hours of jobs running at the same time are not added up | - | readings to check against the saved source, not proven wrong |
| 29 | f1.py 1437, 1462 (live: api/main.py:88) | days_under_hours or periods_not_reported unknown | `numbers.get(..., 0)`: unknown read as **0** | - | `hours_under_threshold` / `report_employer` not raised |
| 30 | f1.py 632, 647-648 | - | end None is read as today (legacy contract: null end means still employed); overlapping hours take the max, not the sum | - | - |
| 31 | contracts/case.schema.json `$defs/scalar` and `record.fields` | - | any field accepts any string of 1 to 120 characters, a boolean, null, or a periods array | - | where #1 to #3 and #26 enter |

## Collapses

**A. An unknown value is treated as no job, and the count is still shown (rows 2 to 4, 6, 12 to 14, 16).** Unreadable or `not_sure` hours, a missing or bad start, an end before the start, an `under` that points at no record, or a `not_sure` on_campus all make the job disappear.
- The base case then shows 121 days, a limit day of 2026-08-29 and the at-or-over judgement, against a correct 30 days and no limit day.
- Rows 2, 12 and 26 ask nothing.
- Row 16 is the same thing for groups: a record whose group key is unknown leaves every group. The other groups stay and are understated.
- Root cause: `_counter` (1124) never blanks the value on `gtr.missing` or `gtr.unsure`. `_days_without` should return None when a candidate job's hours, start or end is unknown.

**B. An unknown end is read as "still going" (rows 8 to 11, plus the trip stage, pack line 2044).** `_days_of` reads the end raw, so absent, `not_sure` and unreadable ends all become the span end.
- A job end of `not_sure` hides the limit day and names nothing.
- A trip with no return day adds 60 days of unemployment and the at-or-over judgement, and nothing is asked.
- The trip stage shows "current" through today for `not_sure` or unreadable `returned_on`.
- The schema says "a field left out is never read as no, none or zero", so even the absent case needs a decision.

**C. An optional member that is unknown is read as absent (rows 21, 25).**
- Move member, pack 2370 / 1727 / 1800 / 1979 / 2113: with the new program's start or level missing, `not_sure` or unreadable, or a `from_program`/`to_program` that points at no record, the OPT card runs to card_end. That gives 121 / 2026-08-29 / at-or-over, against 80 / null when the move is known.
- If one of two moves is undecided, the known move is dropped too.
- Grace, pack 2001 / 2017: if a1's type, program or card_end is unknown, grace shows 2026-05-16 to 2026-07-14 ("done").
- `_first` silently drops records with unknown dates, so the latest card_end comes from the remaining records.

**D. An unknown "as of" date becomes today, and an undated history change is dropped (rows 22 to 23).** The OPT filing windows then move by about seven months. A `not_sure` `granted_on` is never asked.

**E. All-or-nothing selection is still open (rows 15, 27; review findings 1 and 2).** One undecided authorization wipes out every counter on that scope, and the `count_below` gate.

**F. Unreadable numbers are never asked (rows 1, 26, 31).** The contract lets any string in. `_unreadable` checks only dates and choices, and `at_most` goes unknown with nothing asked, so a conflict quietly disappears.

**G. Unknown read as zero:**
- f1.py:1437 and 1462 use a default of 0 for unknown numbers.
- `stem.extensions.all` = 0 and the CPT and OPT-months counts are shown while the authorization list is not stated whole (row 18).

Lower priority: an unknown limit or hours rule gives "not over" or "no threshold" (rows 5, 19); months are double-counted when CPT spans overlap (row 20); a `not_sure` date fact is not traced (row 24).

The verdict was cannot_tell in every probe, so none fell back to the quiet state. Each case in A to G still shows a date or count that rests on a guessed fact.
