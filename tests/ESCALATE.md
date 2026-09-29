# ESCALATE: L-tests, sourcing round, 2026-09-28

## What is wrong

The stop hook runs this lane's test from .claude/lanes/L-tests.yaml: `uv run pytest -q`.
It fails. The mission for this round says: "The engine does not read the new ids yet, so
the new tests cannot pass now; that is expected." Both cannot hold in the same round.
The same disagreement was recorded in iteration 1 (tests/PROGRESS.md, "Stop hook and the
mission disagree"). This is the second time, so I stop here.

## State of the work

- The done command from specs/phase-2/plan-sourcing.yaml passes (exit 0).
- The work is committed on lane/L-tests/sourcing. Nothing is pushed.
- Every test that existed before this round passes: `503 passed`.
- The two new files fail against the engine as it is: `137 failed, 7 passed`.
- Against a throwaway reference with the addendum applied, every engine test and every
  hidden test passed. Details in tests/PROGRESS.md, iteration 2.

## Failure tail

```
Lane test failed: uv run pytest -q
FAILED tests/unit/engine/test_f1_sourcing.py::test_no_settings_means_the_shipped_file
  - TypeError: compute_f1() got an unexpected keyword argument 'settings'
FAILED tests/unit/engine/test_f1_sourcing.py::test_a_setting_is_never_shown_as_law[case_a]
  - TypeError: compute_f1() got an unexpected keyword argument 'settings'
FAILED tests/unit/engine/test_f1_sourcing.py::test_there_is_one_report_for_each_interval_in_the_extension
  - TypeError: compute_f1() got an unexpected keyword argument 'settings'
```

## What I did not do, and why

- Skip, xfail, or guard the new tests. That turns them green by switching them off.
- Add the `settings` argument to engine/f1.py. This lane does not own engine/.
- Edit .claude/lanes/L-tests.yaml or the hook. This lane does not own .claude/.

## What would clear it

One of these, by someone who owns the file:

1. Set the L-tests lane test for a round where the tests come first to the round's done
   command, or to `uv run pytest -q` limited to the tests that existed before the round.
2. Run round T (L-engine). The hook then passes once the engine takes `settings` and
   reads the new ids, and once the shipped pack holds the five new rules.
