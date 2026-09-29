# Phase 2 fixes: answers to the review of 2026-09-28

The reviewer vetoed phase 2 (reviews/phase-2.md). Finding 3 was closed by rounds S and T. This file covers findings 1, 2, 4, 5 and 7. Finding 6 (which calendar "today" belongs to) waits for a founder decision and is not part of this work.

The contracts are already changed on this branch. Lanes may not change them.

## Finding 1: STEM without OPT (L-tests, L-engine)

When `stem` is present and `opt` is absent, the counting window cannot be known. `missing_inputs` names `opt` and the verdict is `cannot_tell`. The same holds for `cap_gap` present with both `opt` and `stem` absent.

General rule, which the tests state as a property: for every case, if any part of the case that a computed item would need is absent or null, the verdict is never `no_open_items`.

## Finding 2: numbers that are not numbers (L-tests, L-api)

The api refuses NaN, Infinity and -Infinity anywhere in the body with a 422 in plain words, before validation. `parse_case` in the engine refuses them too, with a ValueError, so the engine is safe when called without the api.

## Finding 4: bounded work (L-tests, L-api, L-engine)

- contracts/case_f1.schema.json now bounds dates to 1950 through 2099 and employment to 50 periods. A case outside the bounds gets a 422 in plain words, never a 500.
- The compute handler does not run the engine on the event loop. A plain `def` handler is enough.
- The engine does not loop over days when the inputs already conflict; it returns the items it can and the conflict.
- Counting must not depend on the length of the window one day at a time. Count by intervals. A property test compares the interval count with a plain day-by-day count on small windows.
- Test: the largest case the contract allows answers in under one second.

## Finding 5: each item shows the paragraph that states it (L-content, L-engine)

New rules for L-content to find and source, with a row under each regime where the two texts differ:

| id | assumed value | unit | where to look |
|---|---|---|---|
| opt.latest_start_after_days | 60 | days | 8 CFR 214.2(f)(11)(i)(D), "may not request a start date that is more than 60 days after" |
| stem.apply_window_closes_rule | true | flag | the words in 8 CFR 214.2(f)(11)(i)(C) that say the extension must be filed before the current authorization ends |

`opt.latest_start` cites `opt.latest_start_after_days`. `stem.apply_window_closes` cites `stem.apply_window_closes_rule`. If the source does not state the closing of the window, leave the rule out, say so in the progress log, and the engine leaves `stem.apply_window_closes` out of its output.

`stem.final_evaluation_due` is renamed `stem.final_evaluation_due_from_ead_end`, so the name says what the arithmetic is.

## Finding 7: the screen never states a legal status on its own (L-engine, L-web)

Every item with `alternates` also carries `operative`: the operative regime's id and its `legal_status` from the pack. The screen shows that status in plain words and has no status written into it. Test with a pack whose operative regime is `appealed`.

## The tests (L-tests)

Add tests for every line above, in tests/unit and in tests/holdout. Add the two new ids to tests/support/f1_pack.py. The new tests cannot pass until the other lanes finish; that is expected.
