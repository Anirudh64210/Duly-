"""Holdout: W2-P1 journey pairs (specs/step-w/SPEC-W2.md points 45, 46, 49; G5, G7, G13, G15),
each a pair on either side of the line it turns on, sent through POST /v1/compute as the
journeys are. Never shown to the building lanes. Today is 2026-09-29 in America/New_York
through an injected FixedClock; each date is worked by hand beside its assertion.
"""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock  # type: ignore[attr-defined]
from tests.support.api_client import CheckedClient
from tests.support.records_case import CLOCK, case, rec, whole


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield CheckedClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def _send(client: TestClient, body: dict[str, Any]) -> dict[str, Any]:
    res = client.post("/v1/compute", json=body)
    assert res.status_code == 200, res.text
    out: dict[str, Any] = res.json()
    return out


def _windows(out: dict[str, Any], prefix: str) -> list[dict[str, Any]]:
    return [w for s in out["stages"] for w in s["windows"] if w["id"].startswith(prefix)]


def _program(end: str) -> dict[str, Any]:
    return rec(
        "p1",
        "program",
        where="us_on_f1",
        level="bachelor",
        stem_list="not_on_list",
        end_date=end,
        state="completed",
    )


def _opt(dso_on: str, filed_on: str, start: str, end: str) -> dict[str, Any]:
    return rec(
        "a1",
        "authorization",
        type="opt_post_completion",
        program="p1",
        decision="approved",
        dso_on=dso_on,
        filed_on=filed_on,
        card_start=start,
        card_end=end,
    )


LISTS = whole("program", "authorization", "work", "trip", "move", "petition", "withdrawal")


# G5: program end 2026-04-15; the window closes 60 days on: 15 of April reach Apr 30, 31 of
# May reach May 31, 14 more 2026-06-14. A recommendation on 2026-05-14 plus 30 is 2026-06-13
# (17 of May, 13 of June): the day before the window's close. On 2026-05-16 it is 2026-06-15
# (15 of May, 15 of June): the day after.


@pytest.mark.parametrize(
    ("dso_on", "last_day"), [("2026-05-14", "2026-06-13"), ("2026-05-16", "2026-06-14")]
)
def test_opt_last_day_either_side_of_the_window_close(client, dso_on, last_day):
    body = case(
        [_program("2026-04-15"), _opt(dso_on, "2026-06-01", "2026-07-01", "2027-06-30")], LISTS
    )
    out = _send(client, body)
    assert [w["closes"] for w in _windows(out, "opt.last_day.")] == [last_day]


# G13: program end 2026-06-29 opens the OPT window on 2026-03-31 (29 back reach May 31, 31
# Apr 30, 30 Mar 31), so Prepare opens 2026-02-28. Program end 2026-06-30 opens it on
# 2026-04-01 (30, 31, 29), so Prepare opens 2026-03-01.


@pytest.mark.parametrize(
    ("end", "prepare"), [("2026-06-29", "2026-02-28"), ("2026-06-30", "2026-03-01")]
)
def test_prepare_either_side_of_a_month_end(client, end, prepare):
    body = case(
        [_program(end), _opt("2026-05-01", "2026-05-10", "2026-07-15", "2027-07-14")], LISTS
    )
    out = _send(client, body)
    planned = [w for s in out["stages"] if s["id"] == "opt_post.a1" for w in s["windows"]]
    assert [w["opens"] for w in planned if w.get("planning") is True] == [prepare]


# G15, N2: card 2026-07-01 to 2027-06-30; the job from 2026-07-01 ends 2026-08-15: Aug 16 to
# Sep 29 is 16 + 29 = 45 days; 45 more reach 2026-11-13 (Sep 30 is 1, Oct 31 is 32). Ending
# 2026-08-16: 44 days, 46 more, 2026-11-14.


@pytest.mark.parametrize(
    ("job_end", "limit_day"), [("2026-08-15", "2026-11-13"), ("2026-08-16", "2026-11-14")]
)
def test_limit_day_either_side_of_one_more_idle_day(client, job_end, limit_day):
    job = rec(
        "w1",
        "work",
        employer="e1",
        under="a1",
        start="2026-07-01",
        end=job_end,
        hours_per_week=40,
    )
    records = [
        _program("2026-05-15"),
        _opt("2026-04-01", "2026-04-10", "2026-07-01", "2027-06-30"),
        rec("e1", "employer", name="Employer One"),
        job,
    ]
    out = _send(client, case(records, LISTS))
    got = {i["id"]: i["value"] for i in out["computed"]}
    assert got["unemployment.opt_card.a1.limit_day"] == limit_day


# G7: a job from 2026-09-20 is reported within 10 days, by 2026-09-30; from 2026-09-21, by
# 2026-10-01.


@pytest.mark.parametrize(
    ("start", "closes"), [("2026-09-20", "2026-09-30"), ("2026-09-21", "2026-10-01")]
)
def test_job_start_report_either_side_of_a_month_end(client, start, closes):
    job = rec("w1", "work", employer="e1", under="a1", start=start, hours_per_week=40)
    records = [
        _program("2026-05-15"),
        _opt("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31"),
        rec("e1", "employer", name="Employer One"),
        job,
    ]
    out = _send(client, case(records, LISTS))
    found = [
        w["closes"]
        for s in out["stages"]
        for w in s["windows"]
        if w.get("record") == "w1" and "opt.report_employer_within_days" in w["rule_ids"]
    ]
    assert found == [closes]
