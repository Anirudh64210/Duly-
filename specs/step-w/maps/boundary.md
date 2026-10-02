# Map: boundary

Made by the SPEC-W2-UNKNOWN design workflow on 2026-10-02 from the engine at that time (read only).

**Recommended rule:** refuse a case at the boundary (422) only when its structure is broken, meaning something no person typed and no question could fix. Take in every field value the person could have entered, read it against the kind the pack declares for that field, and when it can't be read, treat it as unknown and ask about it. Never drop it, and never read it as no, none or zero.

## What the boundary accepts today

**`contracts/case.schema.json`** is one contract for every category, and it doesn't know the pack's fields.
- `fields` (:193-214) takes, for any field name, a scalar (:114-135) or a list of periods.
- A scalar is any of: a date, a number from 0 to 100000, a boolean, any string of 1 to 120 characters, or null.
- Because "any string" is one of the options, the date pattern and the number range are never enforced on a field: "forty", "2026-13-40", "2200-01-01" and `true` all pass for every field.
- Facts take the same scalars (:38-48).
- Periods are the one place with types (:137-170): `start` must be a date and `hours_per_week` a number from 0 to 168. So one period with hours "forty" gets the whole case refused.

**`api/case_f1.py`**
- `read_body` (:99-102) refuses non-JSON and NaN or Infinity.
- `first_problem_under` (:113-125) refuses schema errors and unknown time zones. Its words never repeat what was sent (:1-5).

**`api/case.py`** is the `records_case` module. `first_problem` (:32-34) uses the generic schema, and `compute` (:43-48) passes to `engine/path.py`.

**`api/local_routes.py:61-77`** gives 422 for the above, for an answer dated after today, and for any `ValueError` from the engine, always shown as NOT_IN_THE_PACK.

**Engine checks of structure:**
- `path.py:1380-1382` refuses an undeclared category.
- `_refuse_undeclared` (`path.py:159-166`) refuses an undeclared kind or field.
- Undeclared facts are not refused; `path.py:218` simply never reads them.
- Duplicate ids, the kind's `id_prefix` and `max_records` are not enforced anywhere. `path.py:137` builds `{r[ID]: r}`, so a second record with the same id quietly replaces the first.

## The pack does declare a type for each field

`rulepacks/f1-us/v2026.09/parameters.yaml:1453-1621` gives every field of every record kind a `kind`. The allowed kinds are date, count, number, flag, choice, text, link and periods (`contracts/rulepack.schema.json:750-761`). Some kinds carry more:
- choice: `choices` and `not_sure`
- text: `max_length` and `pattern`
- link: `to`, the kinds a link may name

`facts: []` (:1454) is empty for F-1. The engine already holds these declarations (`path.py:133-136`), but `_unreadable` (`path.py:176-182`) only reads dates and choices.

## Probes on step-w

Case: OPT a1 from 2026-06-01, job w1 under a1 from 2026-07-01, lists stated whole, today 2026-09-29. With hours 40, `unemployment.opt_card.a1` is 30.

| w1 input | Count | Limit day | What is asked |
|---|---|---|---|
| hours `"forty"` | 121 | 2026-08-29, plus at-or-over | nothing |
| hours `true` | 121 | 2026-08-29, plus at-or-over | nothing |
| hours `null` | 121 | 2026-08-29 | w1.hours_per_week |
| `under: "p1"` (a program; the pack says `to: [authorization]`) | 121 | 2026-08-29 | nothing |
| `under: "zz9"` (no such record) | 121 | 2026-08-29 | w1.under |
| a second record with id w1 | null | - | the first w1 vanishes silently |

## Why values should not be refused at the boundary

1. **The contract can't know the types.** `case.schema.json` is shared by every category, and field types live in each pack version. Typing it would mean a schema generated per pack. The engine already holds the declarations.
2. **The desktop would lose data.** Desktop main checks the saved case against `case.schema.json` on every write and every read (`desktop/src/casefile.ts:158-159`, `:164-165`). A tighter schema would refuse to save a person's partial record. Worse, after a pack update that changes a field's type, it would refuse to read a case already saved: the whole case is lost, not one field.
3. **A 422 withholds everything.** One bad hours figure would remove every other date in the case. That is the same "a gap in one record removes another record's known date" problem the reviews vetoed.
4. **A refusal can't say what was wrong.** Refusal words never repeat the value (`case_f1.py:1-5`), and the web shows a generic `CaseRefused` (`web/src/lib/records.ts:217`). A question can name the field and show what was entered. That is "confirm, never assume".
5. **Refusing structure costs nobody their typing.** The web keeps the person's draft in memory (`web/src/app/caseStore.ts:25`) and rebuilds the case for each compute (`caseStore.ts:57`, `records.ts:161`). So a structural 422 is a screen bug, and the person's typing survives it.

## What to refuse (422, with its own plain words, not NOT_IN_THE_PACK)

- Non-JSON, NaN, schema shape, undeclared kind, field or category: already refused.
- Two records with the same id. New check, next to `path.py:137`.
- An id without its kind's `id_prefix`, or more records of a kind than its `max_records`. The schema description promises both (:68 and :55).
- A fact the pack doesn't declare, refused the same way as an undeclared field (`path.py:159-166`).

Put these in `_refuse_undeclared`, raising a refusal class with its own message, mapped at `local_routes.py:73-77` and `main.py`. Don't do this in the schema.

## What to take in, read against the pack, and ask

Extend `_unreadable` (`path.py:176-182`) so every declared kind has a reader:

| Kind | Readable when |
|---|---|
| date | an ISO date from 1950 through 2099 |
| number | a finite JSON number that is not a boolean |
| count | a whole number, 0 or more |
| flag | a boolean |
| choice | one of the `choices`, or `not_sure` only where the field allows it (:178 now accepts `not_sure` for every choice) |
| text | a string within `max_length` and `pattern` |
| link | a string naming a record in this case whose kind is in `to` |
| periods | each period's values read the same way |

Strings are not converted: "40" is unreadable and gets asked about.

An unreadable value must be a third state, neither absent nor a value:
- `_field` (`path.py:187-189`) should return an UNREADABLE marker, not ABSENT.
- `present` (`path.py:446-448`) should give unknown for it, not false. This is review finding 3.
- `_days_of` (`path.py:1250`) reads the raw end with `or ends`, so an unreadable end now means "still running". It should read through `_field`.
- The `chain` grouping in `_group_key` (`path.py:1149-1150`) puts a record whose link is dangling or unreadable in its own group. It should be undecided.
- The hours check in `_days_without` (`path.py:1223-1225`) should go unknown, not skip the job. That is review finding 4.

`ask_unreadable` (`path.py:168-174`) should raise `unreadable:<id>.<field>`, separate from `missing:`, with the value as entered in the question's `about`, so the screen can show it.

Loosen the period's `start` and `hours_per_week` in `case.schema.json:137-170` to the same scalar so they are read like other fields. Keep `additionalProperties: false`, which is structure.

## Web side, for a later plan

`cleanField` (`web/src/lib/records.ts:112-127`) quietly drops unparseable numbers and dates, and `caseRecord` (:136) drops dangling links. The person is then asked "missing" about something they did type, and anything saved from the built case loses it. The screen should send the text as typed and let the engine read and ask. Also, `NUMBER_FIELDS` (:97) lists only `hours_per_week`; it should come from the pack's field kinds.

No code was edited. The probe script is `/tmp/bprobe.py`, run with `/Users/ani/Desktop/Duly/duly/.venv/bin/python`.
