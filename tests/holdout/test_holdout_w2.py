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


# reviews/w2-p1.md finding 3: a card from 2026-10-15, no job. If nothing changes, Oct 15-31 is
# 17 counted days, Nov 30 47, Dec 31 78, and 12 more reach 90 on 2027-01-12. From 2026-10-16
# every day is one later: 2027-01-13. Program end 2026-09-15; the card starts inside the 60
# days after it (to 2026-11-14).


@pytest.mark.parametrize(
    ("start", "end", "limit_day"),
    [("2026-10-15", "2027-10-14", "2027-01-12"), ("2026-10-16", "2027-10-15", "2027-01-13")],
)
def test_limit_day_of_a_card_not_started_yet(client, start, end, limit_day):
    records = [_program("2026-09-15"), _opt("2026-08-01", "2026-08-10", start, end)]
    out = _send(client, case(records, LISTS))
    got = {i["id"]: i["value"] for i in out["computed"]}
    assert got["unemployment.opt_card.a1.limit_day"] == limit_day


# reviews/w2-p1.md finding 1: a STEM card (2026-07-01 to 2028-06-30) and a job with e2 from
# 2026-08-03 under it. With the card's employer e1 the job is with a new employer, and the new
# Form I-983 is due by 2026-08-13 (Aug 3 plus 10). With the card's employer left out, Duly
# cannot tell whether the job is new, so it asks for a2.employer and says cannot_tell.


def _stem_case(card_employer: str | None) -> dict[str, Any]:
    extra = {} if card_employer is None else {"employer": card_employer}
    stem = rec(
        "a2",
        "authorization",
        type="stem_extension",
        program="p1",
        extends="a1",
        basis_program="p1",
        decision="approved",
        dso_on="2026-04-05",
        filed_on="2026-04-10",
        card_start="2026-07-01",
        card_end="2028-06-30",
        **extra,
    )
    program = rec(
        "p1",
        "program",
        where="us_on_f1",
        level="master",
        stem_list="on_list",
        end_date="2025-05-15",
        state="completed",
    )
    records = [
        program,
        _opt("2025-04-01", "2025-04-10", "2025-07-01", "2026-06-30"),
        stem,
        rec("e1", "employer", name="Employer One", e_verify="yes"),
        rec("e2", "employer", name="Employer Two", e_verify="yes"),
        rec("w2", "work", employer="e2", under="a2", start="2026-08-03", hours_per_week=40),
    ]
    return case(records, LISTS)


def _new_plan_closes(out: dict[str, Any]) -> list[Any]:
    return [
        w["closes"]
        for s in out["stages"]
        for w in s["windows"]
        if w.get("record") == "w2" and "stem.new_plan_due_days" in w["rule_ids"]
    ]


def test_new_employer_window_with_the_card_employer_known(client):
    out = _send(client, _stem_case("e1"))
    assert _new_plan_closes(out) == ["2026-08-13"]


def test_new_employer_window_with_the_card_employer_left_out_is_asked(client):
    out = _send(client, _stem_case(None))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:a2.employer" in out["verdict"]["reasons"]
    assert any("missing:a2.employer" in q["because"] for q in out["questions"])
    assert set(_new_plan_closes(out)) <= {None}
