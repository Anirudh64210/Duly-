# Map: logic

Made by the SPEC-W2-UNKNOWN design workflow on 2026-10-02 from the engine at that time (read only).

The map below covers every operator `contracts/rulepack.schema.json` allows and every helper they call, read at `07196cd` on step-w with a clean tree. I made no edits and no commits. Two probe scripts were written to scratch and run with the project's venv, at today 2026-09-29 on the shipped F-1 pack: `/var/folders/wr/4yqfch851v90m4n6tc4t7zb00000gn/T/mapprobe/p.py` and `.../mapprobe/q.py`. Rows marked "probed" were confirmed by those scripts. The rest are from reading the code.

In the cells, U means unknown (None), and "asked" means the gap is added to `missing` or `unsure` and so reaches `_need`.

## Table: operator by input state

| Operator (file:line) | Known true | Known false | Absent / null | Unreadable (bad date/choice; string in a number field) | `not_sure` | Undecided record among several |
|---|---|---|---|---|---|---|
| `_unreadable` 176-182 | n/a | n/a | False (not unreadable) | True for a date or choice. False for a number, count, flag, link or periods field: `"forty"` in `hours_per_week` passes | False (passes for every field kind, including dates and numbers) | n/a |
| `ask_unreadable` 168-174 | n/a | n/a | n/a | Asks only record fields of date or choice kind. Never asks `case.facts`, numbers or flags | not asked | n/a |
| `_field` 187-189 | value | value | ABSENT | ABSENT (date/choice only); otherwise the raw string | `"not_sure"` | n/a |
| `_as_given` (history) 191-208 | value as of `on` | same | a change record with no `from` or no link is skipped, so the current value is used | a change record whose `from` is unreadable is skipped, so the current value is used | same as unreadable | n/a |
| `_resolve` 210-232 | value | value | `(ABSENT, asked)`; through a link that is absent or dangling: `(ABSENT, link-name)` | as `_field` | `"not_sure"` | n/a. `record is None` (`outer` None) gives `(ABSENT, None, None)` and is never asked (221-222). A virtual record's fields have `asked=None` (225) |
| `_read` 234-246 | value; adds to inputs | value | ABSENT and asked (silent if `asked` is None) | ABSENT and asked (date/choice); a bad number comes back as a known string | ABSENT, counted as unsure | n/a |
| `_cond`, field only, no operator 496-497 | True | **True** (a flag of `false` counts as known) | U, asked | U for date/choice; True for a bad number | U | n/a |
| `present` 446-449 | `there=True` | True (a value of `false` is present) | `there=False`, so `present:false` is True. **Never asked** (uses `_resolve`, no trace) | **`there=False`** (`_field` gave ABSENT): read as "not entered" (finding 3) | **`there=True`**: read as entered | absent link in the path counts as not present |
| `in` 453-454 | `str(v) in list` | the same (`str(False)`) | U | U, asked (choice/date) | U | n/a |
| `on_or_before`, `on_or_after`, `before`, `after` → `_compare_dates` 519-532 | bool | bool | U (missing traced) | U; asked for a date field. A known value that is not a date gives U **with nothing traced** | U | other side `_when` None gives U, traced only if `_when` traced it (see `fact`) |
| `level_above`, `level_same`, `level_below` → `_level` 534-561 | bool | bool | U | U | U | a value not in `ascending`, or no `order` for the field, gives U **with no trace** (552, 561) |
| `same_as`, `differs_from` 461-465 | bool | bool | U | U (date/choice) | U | n/a |
| `month_day_is` 466-470 | bool | bool | U | U | U | a bad rule text or a lapsed rule gives U (lapse traced) |
| `at_most` 471-474 | bool | bool | U, asked | **U with no trace** (`"40"` is known to `_read`, then `_number` gives None) | U | limit None gives U (lapse traced) |
| `exists`, `none` → `_select` 475-478 | bool(found) | the same | no records of the kind gives `[]`: **exists False, none True**, with no check of `complete` | per record, as `_cond` | per record | **None for the whole selection**, even when a decided record already settles it (finding 1) |
| `count_below`, `count_at_most` 479-488 | compared | compared | `[]` gives count 0, with **no check of `complete`** | per record | per record | **None for the whole selection** |
| `any_of` → `_any` 502-517 | True (others' traces dropped) | False | U if any member is U | as members | as members | as members |
| `all_of` → `_all` 425-440 | True | False (others' traces dropped) | U | as members | as members | as members |
| `not` 493-495 | negated | negated | U | U | U | U |
| `_select` / `_split` 402-423 | chosen | left out | per `where` | per `where` | per `where` | `_split` returns it as undecided; `_select` gives None for all |
| `when.fact` 340-350 | date | n/a | None, asked | None, asked (record field); **a `case.facts` value that does not parse gives None, not asked** | **None, nothing traced** (347: only ABSENT/None is recorded) | n/a |
| `when.as_of` 342-343 | read as of that day | n/a | **today**, trace dropped (`_Trace()` … `or self.today`) | today, not asked from here | **today** | n/a |
| `when.add` (missing base) 353-359 | moved | n/a | base None gives None before `add` (base trace kept) | same | same, untraced | amount None gives None: a lapse is traced; **a non-number rule value or an unknown unit is not** (294-295, 305) |
| `day_before`, `day_after` 360-363 | applied | n/a | never reached | | | |
| `earliest_of`, `latest_of` 313-333 | min/max of members | n/a | a non-optional member None makes the date None (trace merged). **An optional member None with no lapse is skipped and its trace thrown away** (322) | **an optional member is skipped and `missing` dropped** (asked only by `ask_unreadable`) | optional skipped, untraced (probed); non-optional gives None, untraced (probed) | an optional `first` over an undecided selection is skipped (probed) |
| `when.first` → `_first` 389-398 | min/max | n/a | **`found or []`**: an undecided selection reads as none found. A found record with no date is silently left out | left out silently (`_resolve`, not `_read`) | left out silently | **collapsed to empty** |
| `month_day_rule` → `_month_day_when` 366-387 | date | n/a | anchor None gives None | same | anchor None, untraced | lapse traced |
| `window_opens`, `window_closes` 338-339 | **always None, no trace** | | | | | |
| `for_each` (stages) 619-628 | record entered | dropped | per `where` | per `where` | per `where` | asked, others kept (fixed) |
| `for_each` (checks) 1033-1042 | checked | dropped | | | | asked, others kept |
| `entered_when` 630-633 | all present: entered | **`false` counts as entered** | not entered, **nothing asked** | not entered (asked only by `ask_unreadable`) | **counts as entered** (probed: transfer stage with null span, nothing names `release_date`) | n/a |
| `done_when` 814-817 | any present: done | **`false` counts as done** | not done | not done (asked) | **counts as done**: no upcoming entry, no open item (probed) | n/a |
| `only_if` (next) 914-917 | shown | hidden | U: shown and asked | | | |
| `bind` 919-934 | bound | bound | **dropped**, so fewer keys match and any record of the kind can suppress the next stage | the raw value is bound | `"not_sure"` is bound | n/a |
| `ends_also` 756-767 | compared | n/a | **a None reading is ignored and its trace dropped** | same | same | same (via `first`) |
| `_check` 1044-1059 | nothing raised | conflict or judgement | U: `_need(tr)`, **silent if the trace is empty** | | | |
| `run_checks` "happened" 1025-1031 | conflict if after today | n/a | skip | skip (asked elsewhere) | skip, not asked | n/a |
| `_counter` scope 1100-1103 | count | n/a | `[]` | per record | per record | **every group dropped** (finding 2) |
| `_counter` whole check 1106-1107 | n/a | n/a | checks `complete` only for the qualifying/not_qualifying kinds, **never the scope kind**, so `count_of_records` (1175) is shown on an unstated list | | | |
| `_group_key` 1144-1156 | key | n/a | same_value: None, **record left out of every group** (asked). chain: absent link puts the record **in its own chain** | same | same (counted as unsure) | n/a |
| `only_if` (counter) 1119-1125 | counted | no item | U: value None, over False, asked | | | |
| `limit_rule` 1122 | n/a | n/a | limit None: over False, no result (lapse traced) | | | |
| `_span_of` 1158-1166 | span | n/a | None, so the count is None | same | same | **ends before starts gives None with nothing asked** |
| `_days_without` hours 1215-1225 | counted | under the limit, not counted | **`continue`: job read as no job** (asked) | **`continue`, nothing asked** | **`continue`** (counted as unsure) | `hours_rule` lapsed: **no hours filter at all** (lapse traced) |
| `_days_without` qualifying, not_qualifying 1218-1232 | | | | | | None, so the count is None |
| `_days_of` 1245-1254 | days | n/a | first: **`set()`, job covers nothing** (asked). last: `or ends`, read as ongoing | last: **read as ongoing** (probed: count 30) | first: `set()` (probed: count 121, limit day 2026-08-29, at-or-over raised); last: **ongoing** (probed) | last before first gives an **empty set with no conflict** (probed: 121, at-or-over) |
| `limit_day` 1131-1137 | the limit-th day | None if never reached | None when value is None | inherits the collapses above | | |
| `ends_before_today` 1300-1311 | asked or judged | n/a | **any None end skips the question** | | | |

## Where unknown is collapsed to false, empty, absent, zero, today or done

1. **`present` reads unreadable as absent and `not_sure` as present, and never asks** (path.py:447-449). Finding 3 remains open; with `present: true` alone, `not_sure` counts as entered.
2. **`_select` makes the whole selection unknown when one record is undecided** (402-404). It is used by `exists`/`none` (477), `count_*` (481), `_first` (390), the counter scope (1100) and `_days_without` (1218, 1228). This is findings 1 and 2. The contract itself says this: the selector description reads "A record for which a condition is unknown makes the selection unknown".
3. **`exists`, `none` and `count_*` over a kind with no records** give False, True or 0 without checking `case.complete` (475-488). Only counters check `_stated`.
4. **`_first` turns an undecided selection into empty** with `found or []` (393). It also leaves out found records whose date is absent, unreadable or `not_sure`, with no trace, because it uses `_resolve` instead of `_read` (394). Probed: a move with no `from_program` leaves opt_post `current`, ending 2027-05-31, as if there were no move. With `from_program: p1` the end is null and `end_by_source` is raised.
5. **An optional member of `earliest_of`/`latest_of` is skipped on any None without a lapse, and its trace is thrown away** (322). That covers `not_sure`, unreadable, a broken link path, an undecided `first` and an unknown setting unit, not only "absent" as the schema says. Probed: `release_date` "2026-13-40" gives the move span 2026-09-01 from `i20_issued_on` alone.
6. **`when.fact` with `not_sure` gives None and records nothing** (345-349), so no question and no `.not_sure` judgement. Probed: program `end_date: not_sure` leaves the program stage `unknown` and every opt_post window null, and no reason names `p1.end_date`.
7. **`case.facts` values are never checked by `_unreadable` or `ask_unreadable`** (171, 218). An unparseable fact date gives None with nothing asked.
8. **`as_of` falls back to today** when its base is absent, unknown or unreadable, and drops the trace (343). For example, `filed_on` `not_sure` reads `program.end_date` as it stands today.
9. **`_as_given` skips a history record whose `from` or link is missing or unreadable**, so the current value is used (200-204).
10. **`window_opens`/`window_closes` always give None with no trace** (338-339).
11. **`entered_when`** (630-633): absent means the stage is silently not entered, nothing asked. `not_sure` or `false` means entered.
12. **`done_when`** (814-817): `not_sure` or `false` counts as done, so the window drops from upcoming and open items. Probed: `contacted_new_dso_on: not_sure` removes `transfer.contact_new_dso.closes.m1` 2026-10-10 from upcoming.
13. **A field-only condition** (496-497) reads a flag of `false` as True.
14. **`bind`** (926, 933): an absent value is dropped, so a partial match with any record of the kind suppresses the next stage.
15. **`_ends_also`** (760): an unknown second reading counts as no reading, and its trace is dropped.
16. **Unknown with an empty trace becomes no reason at all.** `_check` holds None calls `_need(tr)` with nothing to ask (1058-1059), and the same for a stage span. Sources of an empty-trace unknown:
    - `at_most` on a string number (472)
    - a non-date value in a comparison (522)
    - `_level` with a value not listed or no order (552, 561)
    - `when.fact` with `not_sure` (347)
    - `window_*` (339)
    - `_amount` with a non-number rule value or unknown unit (294, 305)
    - `_resolve` with `outer` None or a virtual record (221, 225)
    - `_span_of` with ends before starts (1164)
17. **`_unreadable` covers only date and choice fields** (180-182). A number, count, flag or link given as any string passes, and `contracts/case.schema.json` scalar allows any string of 1-120 characters (finding 4's boundary).
18. **Counter whole check** (1106-1107): ignores the scope's own kind, so `count_of_records` (1175) is shown on a list nobody stated whole.
19. **`_group_key`** (1150, 1155): same_value with an absent value leaves the record out of every group. chain with an absent or dangling link puts the record in its own chain.
20. **`_days_without` hours** (1216-1225):
    - hours absent, unreadable or `not_sure`: job read as no job (finding 4, still open).
    - hours rule lapsed: no hours threshold at all.
21. **`_days_of`** (1247-1254):
    - start absent or `not_sure`: the job covers no days. Probed: 121 days, limit day 2026-08-29, at-or-over raised beside `w1.start.not_sure`.
    - end absent, unreadable or `not_sure`: read as ongoing. Probed: count 30 with no `w1.end.not_sure`.
    - end before start: covers nothing, no conflict. Probed: 121 days and at-or-over raised, nothing asked.
    - no span fields declared: empty set.
22. **`ends_before_today`** (1302): any unknown end silently skips the question.
23. **`run_checks` "happened"** (1028-1029): `not_sure` dates are skipped without being asked.

The engine handles these correctly:
- `in`, `same_as`, `differs_from` and `not`, and `any_of`/`all_of` (Kleene logic).
- The stage and check `for_each` split, after the fix 2 changes.
- `_state`, `_closed` and `_next` `only_if`, where unknown is shown and asked.
- `_compare_dates` when the field is absent or unreadable.
- A missing base in date arithmetic, which gives None with the trace kept.

`engine/f1.py` was not mapped: the task limits the map to `path.py` and the helpers it calls.
