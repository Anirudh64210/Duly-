"""engine/f1.py and unknown numbers: specs/step-w/SPEC-W2-UNKNOWN.md point 24, R25 and P2f
(point 46). f1.py's `numbers.get(..., 0)` (f1.py 1437, 1462) reads a number it could not work
as 0, so a check that rests on it is never raised. With the hours rule left out of the pack, the
days under hours cannot be worked: a missing reason, never 0 and never silence.
"""

import copy
from datetime import date
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from tests.support.f1_pack import build_pack, case_problems, clock_on, job
from tests.support.gaps import UNIT_EXAMPLES
from tests.unit.engine.test_f1 import CASE_A

TODAY = date(2026, 9, 28)
UNIT = settings(max_examples=UNIT_EXAMPLES, deadline=None, derandomize=True)


def _run(case: dict[str, Any], **pack: Any) -> dict[str, Any]:
    assert case_problems(case) == []
    clock = clock_on(TODAY)
    return f1.compute_f1(f1.parse_case(case, clock), build_pack(TODAY, **pack), clock)


def _with_jobs(*jobs: dict[str, Any]) -> dict[str, Any]:
    case = copy.deepcopy(CASE_A)
    case["employment"] = list(jobs)
    return case


def test_r25_days_under_hours_that_cannot_be_worked_give_a_missing_reason():
    # R25: a job at 10 hours a week from 2026-07-01, open. With opt.min_hours_per_week left
    # out, whether 10 is under the threshold cannot be decided: f1.py today reads the days
    # under hours as 0 and says nothing. Point 24: a missing reason instead, and no
    # employment.days_under_hours item shown as 0.
    out = _run(_with_jobs(job("2026-07-01", None, hours=10)), leave_out=("opt.min_hours_per_week",))
    reasons = out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "cannot_tell"
    assert any(r.startswith("missing:") and "hours" in r for r in reasons), reasons
    shown = {i["id"]: i for i in out["computed"]}
    under = shown.get("employment.days_under_hours")
    assert under is None or under["value"] != 0


@UNIT
@given(st.integers(0, 60), st.sampled_from([5, 10, 19, 20, 21, 40]))
def test_p2f_a_job_s_known_dates_and_hours_give_the_same_reasons_on_every_drawn_fill(shift, hours):
    # P2f (point 46), (a) and (d) on the case_f1 contract's job dates and hours: the case_f1
    # contract takes no unknown value in a job (start a date, hours a number), so the unknown
    # is the hours rule left out. (d): with the rule out, the verdict is cannot_tell for every
    # job; (a): an at-or-over judgement known with the rule out is the same with it in.
    start = date.fromordinal(date(2026, 6, 1).toordinal() + shift).isoformat()
    case = _with_jobs(job(start, None, hours=hours))
    held = _run(case, leave_out=("opt.min_hours_per_week",))
    shown = _run(case)
    assert held["verdict"]["state"] == "cannot_tell"
    for reason in held["verdict"]["reasons"]:
        if reason.endswith("at_or_over_limit"):
            assert reason in shown["verdict"]["reasons"]
