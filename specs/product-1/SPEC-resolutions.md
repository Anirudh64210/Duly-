# Product round 1: resolutions of the engine builder's escalation

The engine builder built sections 1 to 6 and stopped on 66 tests that contradict SPEC.md or the output contract (engine/PROGRESS.md, run l-engine-b63b2c6ea2, "Disputes"). The builder was right on every one. This file settles them. Where it and a test disagree, this file and SPEC.md win.

## Settled

1. A question's id may hold dots. The contract says so now.
2. An answer dated after the day the case is run is refused. A test that dates an answer later than its case's day is wrong: date the answer on or before the day of the case.
3. `no_employment_to_record` covers the days through the day it was given. When the case runs on a later day, the question is open again and the count is null until it is answered again.
4. While a conflict of SPEC section 1 is open, the items that use its dates are null. An older test that expects a date or a count from a case that holds such a conflict is wrong: either the case is changed so that its facts fit, or the test expects null and the conflict.
5. An item whose step is recorded as done is not an open item (SPEC section 4). An older test that expects it as open is wrong.
6. A question carries `id`, `because` and `about`.
7. New: an answer with no `about` is not an answer. The question stays open. Duly never assumes that an answer was given for the values in front of it.
8. New: `parse_case(raw, clock)` takes the clock, so that an answer dated after today is refused however the engine is called. The api passes its clock and turns the ValueError into a 422 in plain words.
9. `unemployment.days_used` on a STEM card names both limit rules, because the days of the OPT card are in the count.
10. A card whose last day is the day its months end is not a conflict.

## Covers

Register rows: DEC-D41-001, BACK-003, BACK-006, DEC-D05-001, PRIN-008. That is 5 of 1623 requirements; the rest of product round 1 is listed in SPEC.md.
