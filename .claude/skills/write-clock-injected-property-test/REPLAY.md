# Replay: write-clock-injected-property-test

Date: 2026-09-28. Curator: L-factory, first curation run. Base: 8f92f1b.
Referenced files: tests/unit/engine/test_verdict.py, engine/clocks.py, security/semgrep/duly.yml. None changed since the skill was written, so the skill is not stale.

## Task

Add a function to engine/ that counts days between two dates, and test it.

## What each arm did

| | With the skill | Without the skill |
|---|---|---|
| Code | engine/daycount.py: days_between(start, end), days_until(target, clock), days_since(past, clock). Today comes from the Clock passed in | engine/dates.py: days_between(start, end). Reads no clock |
| Tests | tests/unit/engine/test_daycount.py, with FixedClock, properties, and the day before, of, and after | tests/unit/engine/test_days_between.py, with FixedClock in one example, 6 properties, 17 worked examples |
| Attempts before green | 1 | 1 |

## Checks the curator ran on each arm

| Check | With | Without |
|---|---|---|
| grep for date.today(, datetime.now(, utcnow(, time.time( in engine/ and tests/unit/engine, outside clocks.py | none | none |
| uvx semgrep scan with security/semgrep on engine/ (the rule duly-time-only-through-clocks) | exit 0 | exit 0 |
| pytest tests/unit/engine | green | green |
| New test file uses FixedClock and @given | yes | yes |

## Result

No change in outcome. Neither arm read the system time. The predicted failure of the arm without the skill (a call to date.today() and a red gate 4) did not happen.

One difference that is not an outcome: the arm with the skill added two functions that take a Clock; the arm without it kept the function pure and left the clock to the caller.

## Curator's recommendation

Rejected under rule 2 of the curator. Proposed for removal, or for a harder replay task in which today is part of the question, for example "count the days left until a date". The founder decides. The skill file is unchanged.

## Limits of this replay

- One run for each arm. A single run cannot show a rate.
- Both arms were the same model. The arm without the skill still had CLAUDE.md, BOUNDARY.md, and the code and packs of phase 2 in front of it, and these now state most of what the skill states. The lane agents of phase 2, who met the failures, worked before that code existed.
- The scratch copy was made with git archive under .claude/LESSONS/.scratch/, which git ignores. tests/holdout, .claude/skills, and .claude/LESSONS were left out of it. It was deleted after grading.
- The arm with the skill was given the numbered steps of SKILL.md in its prompt. The Skill tool was not used in either arm.
