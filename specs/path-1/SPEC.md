# Path round 1: the engine holds no scenario of its own

Read DECISIONS.md D47, D48 and D53, PRINCIPLES.md and BOUNDARY.md first.

## Covers

Register rows: DEC-D48-002, BACK-013, BACK-014, BACK-015, BACK-016, DEC-D47-003, BACK-003, BACK-004, DEC-D12-001, DEC-D12-002, DEC-D12-003, DEC-D12-004, DEC-D12-010. That is 13 of 1623 requirements. It adds no new category: it moves F-1 onto the model that every later category is built on. Breadth follows in its own rounds, pack by pack (D48 step 5), and this round is what makes each of those a matter of sourcing rules, not writing code.

## Why

Today engine/f1.py holds F-1's stages, windows, next steps and conflict checks in code. A new category would mean new code, and every scenario would be written by hand. The founder's product (D47) is every case in every category. So the path becomes data in the rule pack, beside the sourced rules it rests on, and the engine becomes a reader of that data.

## The contracts (already on this branch; lanes may not change them)

- contracts/rulepack.schema.json gains `path`: the facts a person can enter, the stages, each stage's span, the windows in it, the stages that can follow, the lists of what an official source requires, and counters. A date is always a fact moved by sourced rule amounts. A literal number is never allowed.
- contracts/case.schema.json: a case for any category, as facts named by the pack.
- contracts/case_f1.schema.json and POST /v1/compute/f1 stay as they are. F-1 cases are translated to facts.

## The engine (L-engine)

`engine/path.py`, a reader of any pack's path. It returns the engine output contract as today.

1. Stages entered: a stage is entered when all its `entered_when` facts are present. The current stage is the latest entered one whose span has not ended.
2. Dates: every `when` is evaluated from facts and rule values, looked up by date and regime (`Rulepack.value`). The regime alternates follow as today.
3. Windows of entered stages and of the stages named in `next` become computed items and `upcoming`, unless a `done_when` fact is entered.
4. Counters: `days_without_qualifying_period` is today's unemployment count, moved out of f1.py and named by the pack. Only the calculators in the contract exist.
5. Facts that do not fit, for every pack, with no per-category code:
   - a `happened` date after today
   - a span whose end is before its start
   - a span longer than its `longest` amount
   - a gap or an overlap with a stage it `follows`, beyond `gap_allowed`
   - a period with days outside every span that allows it
   Each raises the conflict and question of SPEC product-1 section 1, with ids formed from the fact or stage ids.
6. Missing facts: a fact needed by an entered stage or a shown window and not entered is named in `missing`, and a question asks for it, as today. A category with a pack whose path is empty returns cannot_tell with the reason `category_not_covered:<id>`. It never guesses.
7. `compute_f1` becomes a translation of the F-1 case into facts plus a call to `path.py`. Its output for every existing test case is the same as before, except where the tests say otherwise.

No F-1 id, date, stage or number may appear in engine/path.py. A test checks this.

## The rules (L-content)

Write F-1's `path` in rulepacks/f1-us/v2026.09/parameters.yaml, from the rules already sourced: stages program, CPT, post-completion OPT, STEM OPT, cap-gap and grace, their spans, their windows (the OPT and STEM filing windows, the evaluations and validations, the cap-gap end), the next steps between them, and the list of what the regulation lists for the STEM extension. Every amount names a sourced rule. Where a window needs a rule the pack does not hold, find it in a primary source and add it, or leave the window out and say so. Record in your progress log every place where writing the path showed a rule missing or a reading needed.

## The tests (L-tests)

- tests/unit/engine/test_path.py, from this SPEC and the contracts, with small packs made in the test: stages, windows, next, done_when, each conflict kind, a pack with no path, the literal-free rule.
- Parity: every case in tests/unit/engine and tests/holdout gives the same output through the translation as before, except where the tests of product round 1 say otherwise.
- A test that engine/path.py names no category.
- Hidden tests in tests/holdout for the same.

## Done

1. The offline gates, the hidden tests and the source check pass.
2. The reviewer approves.
3. The auditor re-checks the covered rows and reports what share of the whole is met.
