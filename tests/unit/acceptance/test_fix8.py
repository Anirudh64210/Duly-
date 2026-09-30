"""Resolutions point 22b (review fix7 finding 1 and 2), each case sent through POST /v1/compute.

Specified in specs/product-2/resolutions.md point 22b: "The engine puts the step-back reason
(`cap_gap.for_dso`) in a stage's `reasons` only when a member that point 19 or 23 nulls made
that stage's start or end null. No other stage carries it. A case with no petition carries it
on no stage (point 19: every other journey unchanged)." A stage's `reasons` is the field of
contracts/engine_output.schema.json ("The verdict reasons that rest on this stage's items or
facts"); a stage that leaves the field out carries no reason.

The journeys are the cases of test_journeys.py (specs/path-1/journeys.json), with a
change-of-status petition h9 added where a point needs it. Today is 2026-09-29 in
America/New_York, through the injected FixedClock of tests/support/records_case.py. Every
expected date and count is worked out by hand beside its assertion.

Point 22b names three mutants of review fix7 finding 2 (reviews/product-2-fix7.md). The test
that kills each says so, as "Kills:". The names carry "point_22b" and "mutant" so a build
lane can select them.

Not expected to pass before the build round of plan-fix8.
"""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock
from tests.support.api_client import CheckedClient
from tests.support.records_case import (
    CLOCK,
    question_ids,
    reasons,
    rec,
    stage,
    value,
    whole,
    window,
)
from tests.unit.acceptance import test_journeys as journeys

URL = "/v1/compute"
STEP_BACK = journeys.STEP_BACK

# The journeys that hold no petition record. J12, J13 and J14 each hold one (h1). J11 states
# its petition list whole with none on it.
WITHOUT_A_PETITION = [
    "j01",
    "j02",
    "j03",
    "j04",
    "j05",
    "j06",
    "j07",
    "j08",
    "j09",
    "j10",
    "j11",
    "j15",
    "j16",
    "j17",
    "j18",
    "j19",
    "j20",
]


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield CheckedClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def _send(client: TestClient, body: dict[str, Any]) -> dict[str, Any]:
    res = client.post(URL, json=body)
    assert res.status_code == 200, res.text
    out: dict[str, Any] = res.json()
    return out


def _with_petition(body: dict[str, Any], **fields: Any) -> dict[str, Any]:
    """The case with a change-of-status petition h9 from employer e9, the petition list whole."""
    body["records"] += [
        rec("e9", "employer", name="Employer Nine"),
        rec("h9", "petition", employer="e9", change_of_status="yes", **fields),
    ]
    body["complete"].update(whole("petition"))
    return body


def _carrying_the_step_back(out: dict[str, Any]) -> list[str]:
    """Ids of the stages whose own reasons hold cap_gap.for_dso."""
    return [s["id"] for s in out["stages"] if STEP_BACK in (s.get("reasons") or [])]


def _row(out: dict[str, Any], stage_id: str) -> tuple[Any, Any, Any]:
    s = stage(out, stage_id)
    return s["starts"], s["ends"], s["state"]


# Point 19 and point 22b: "A case with no petition carries it on no stage." The fix7 build
# gave no stage reasons at all, so today these hold; they fail on an engine that puts the
# step back on any stage with a null start or end (the unknown transfer and job-end rows of
# J01, J03, J04, J07, J08, J10, J15 and J19, review fix7 finding 1).


@pytest.mark.parametrize("jid", WITHOUT_A_PETITION)
def test_point_22b_a_journey_without_a_petition_carries_the_step_back_on_no_stage(
    client: TestClient, jid: str
) -> None:
    # Kills: cap_gap.for_dso put in the reasons of every unknown stage, whatever the cause.
    out = _send(client, getattr(journeys, jid)())
    assert _carrying_the_step_back(out) == []
    assert STEP_BACK not in reasons(out)


@pytest.mark.parametrize("jid", WITHOUT_A_PETITION)
def test_point_22b_no_stage_with_a_null_start_or_end_is_current(
    client: TestClient, jid: str
) -> None:
    # Point 22b, first line: a stage whose start or end is null "is never shown as now,
    # whatever the cause (the fix 6 eyebrow "School transfer" on J01, J03, J10 and J19 was
    # wrong, and stays removed)". Kills: the fix 6 fall-back of an open-ended stage to current.
    out = _send(client, getattr(journeys, jid)())
    open_ended_current = [
        s["id"]
        for s in out["stages"]
        if s["state"] == "current" and (s["starts"] is None or s["ends"] is None)
    ]
    assert open_ended_current == []


# Point 22b, third line: an unknown stage "keeps its own known dates (for example "from Jul 15,
# 2024") and its items, including the questions that would close it." On the engine side the
# stage keeps its start. A transfer stage starts on the move's release_date; its end waits on
# <move>.contacted_new_dso_on, which the person has not entered in any journey, so the end is
# null and the stage is unknown.


def test_point_22b_j01_the_transfer_keeps_its_start_and_its_question(client: TestClient) -> None:
    # J01 mv1: release_date 2024-07-15, contacted_new_dso_on not entered. So starts 2024-07-15,
    # ends null, state unknown; the contact-new-DSO window opens 2024-07-15 and closes null;
    # mv1.contacted_new_dso_on is asked; no step back (no petition).
    # Kills: an unknown stage stripped of its known start, or its items, or its question.
    out = _send(client, journeys.j01())
    assert _row(out, "transfer.mv1") == ("2024-07-15", None, "unknown")
    assert window(out, "transfer.contact_new_dso.mv1") == ("2024-07-15", None)
    assert stage(out, "transfer.mv1")["items"] != []
    assert "mv1.contacted_new_dso_on" in question_ids(out)
    assert STEP_BACK not in (stage(out, "transfer.mv1").get("reasons") or [])


@pytest.mark.parametrize(
    ("jid", "move", "release"),
    [
        # Each start is the move's release_date as entered in the journey case.
        ("j03", "mv1", "2024-07-22"),
        ("j04", "mv1", "2022-08-15"),
        ("j07", "mv1", "2025-05-09"),
        ("j10", "mv1", "2025-06-30"),
        ("j19", "mv1", "2021-08-06"),
        ("j19", "mv2", "2023-06-15"),
    ],
)
def test_point_22b_each_transfer_keeps_its_release_date_as_its_start(
    client: TestClient, jid: str, move: str, release: str
) -> None:
    # Kills: the start of an unknown stage nulled, or the stage marked current.
    out = _send(client, getattr(journeys, jid)())
    assert _row(out, f"transfer.{move}") == (release, None, "unknown")
    assert window(out, f"transfer.contact_new_dso.{move}")[0] == release


@pytest.mark.parametrize(
    ("jid", "job_end"),
    [
        # w1's end as entered: J01 2024-06-18, J08 2025-01-12, J15 2025-03-31.
        ("j01", "2024-06-18"),
        ("j08", "2025-01-12"),
        ("j15", "2025-03-31"),
    ],
)
def test_point_22b_an_open_job_end_report_keeps_its_opening_day(
    client: TestClient, jid: str, job_end: str
) -> None:
    # The loss of employment report window opens on the job's end. The fix7 build leaves its
    # close null on these three, and the stage is not current. Kills: a known opening day
    # dropped from a stage no petition touched, or the stage shown as now.
    out = _send(client, getattr(journeys, jid)())
    assert window(out, "opt_job_end.report.w1")[0] == job_end
    assert stage(out, "opt_job_end.w1")["state"] != "current"


# Petition cases. Point 22b: only a stage "a member that point 19 or 23 nulls made" null
# carries the step back. "So J14's opt_job_end.w1 and stem_job_end.w2 and the 2021 and 2023
# transfers of the J19 twins carry neither."


def test_point_22b_j12_only_the_grace_the_petition_nulled_carries_the_step_back(
    client: TestClient,
) -> None:
    # J12: h1 approved, validity_start 2026-10-01, on or after a1's start 2025-06-01, so it
    # could extend a1 and point 19 nulls grace.p1 (test_journeys.py
    # test_j12_the_grace_it_could_follow_is_null). opt_post.a1 keeps its dates.
    # Kills: the step back given to no stage, or to every stage of a petition case.
    out = _send(client, journeys.j12())
    assert _row(out, "grace.p1") == (None, None, "unknown")
    assert _carrying_the_step_back(out) == ["grace.p1"]


def test_point_22b_j13_only_the_grace_the_petition_nulled_carries_the_step_back(
    client: TestClient,
) -> None:
    # J13: h1 denied, requested_start 2026-10-01, after a1's start 2025-07-01, so grace.p1 is
    # nulled. opt_job_end.w1: w1 ends 2026-08-14, plus 10 days, Aug 15 (1) ... Aug 24 (10), so
    # the report window is 2026-08-14 to 2026-08-24; point 19 does not null it, and it carries
    # no step back.
    # Kills: the step back given to a stage with no span that the petition did not null.
    out = _send(client, journeys.j13())
    assert _carrying_the_step_back(out) == ["grace.p1"]
    assert window(out, "opt_job_end.report.w1") == ("2026-08-14", "2026-08-24")


def test_point_22b_j14_only_the_grace_carries_the_step_back(client: TestClient) -> None:
    # J14: h1 withdrawn, requested_start 2026-10-01, after a2's start 2024-06-01; grace.p1 is
    # nulled. Point 22b names opt_job_end.w1 and stem_job_end.w2 as carrying neither the step
    # back nor the petition's words.
    # Kills: the step back on every unknown stage of a case with cap_gap.for_dso.
    out = _send(client, journeys.j14())
    assert STEP_BACK in reasons(out)
    assert _row(out, "grace.p1") == (None, None, "unknown")
    assert _carrying_the_step_back(out) == ["grace.p1"]


def test_point_22b_j14_the_2024_job_end_keeps_its_date_and_no_step_back(
    client: TestClient,
) -> None:
    # J14 w1 ends 2024-05-31 under a1; its report window opens 2024-05-31. The petition was
    # filed 2026-04-01 and cannot change a 2024 report.
    # Kills: opt_job_end.w1 given cap_gap.for_dso, or its known opening day dropped.
    out = _send(client, journeys.j14())
    assert STEP_BACK not in (stage(out, "opt_job_end.w1").get("reasons") or [])
    assert window(out, "opt_job_end.report.w1")[0] == "2024-05-31"
    assert stage(out, "opt_job_end.w1")["state"] != "current"


def test_point_22b_j14_the_stem_job_end_keeps_its_report_and_no_step_back(
    client: TestClient,
) -> None:
    # J14 w2 ends 2026-07-15 under a2. Plus 10 days: Jul 16 (1) ... Jul 25 (10), so the report
    # window is 2026-07-15 to 2026-07-25 (review fix7 finding 1: "stays dated in the output").
    # Kills: stem_job_end.w2 given cap_gap.for_dso, or its report window nulled.
    out = _send(client, journeys.j14())
    assert STEP_BACK not in (stage(out, "stem_job_end.w2").get("reasons") or [])
    assert window(out, "stem_job_end.report.w2") == ("2026-07-15", "2026-07-25")


# The J19 twins (review fix7, point 23 table). J19: p2 ends 2025-05-16, so the program grace
# begins 2025-05-17; a1 2025-06-09 to 2026-06-08; a2 2026-06-09 to 2028-06-08; grace.p2 would
# be 2028-06-09 to 2028-08-07 (a2's end plus 60: June 9 to 30 is 22, July 31 more is 53,
# August 1 to 7 is 60). The transfers are mv1 (release 2021-08-06) and mv2 (2023-06-15).


def _j19_twin(**petition: Any) -> dict[str, Any]:
    return _with_petition(journeys.j19(), type="h1b", cap_subject="yes", **petition)


def _assert_only_the_grace(out: dict[str, Any]) -> None:
    assert _row(out, "grace.p2") == (None, None, "unknown")
    assert _carrying_the_step_back(out) == ["grace.p2"]
    assert _row(out, "transfer.mv1") == ("2021-08-06", None, "unknown")
    assert _row(out, "transfer.mv2") == ("2023-06-15", None, "unknown")


def test_point_22b_j19_twin_d_only_the_grace_carries_the_step_back(client: TestClient) -> None:
    # Twin D: approved, validity_start 2026-06-09, a2's first day, so it could extend a2 and a1
    # (point 23a) and nulls grace.p2. stem.a2 keeps 2026-06-09 to 2028-06-08 (point 22), so no
    # member made its start or end null and it carries no step back, though its reports are
    # null. The transfers of 2021 and 2023 carry none.
    # Kills: the step back on the transfers of a petition case, or on a stage that only lost
    # reports.
    out = _send(
        client,
        _j19_twin(
            filed_on="2026-04-01",
            requested_start="2026-06-09",
            outcome="approved",
            outcome_on="2026-05-20",
            validity_start="2026-06-09",
        ),
    )
    assert STEP_BACK in reasons(out)
    _assert_only_the_grace(out)
    assert _row(out, "stem.a2") == ("2026-06-09", "2028-06-08", "current")


def test_point_22b_j19_twin_b_only_the_grace_carries_the_step_back(client: TestClient) -> None:
    # Twin B: pending, requested_start 2025-06-01, on or after the program grace's beginning
    # 2025-05-17, before a1's start 2025-06-09. Point 23a: only the program member nulls
    # grace.p2; the cards keep everything.
    # Kills: the step back on the 2021 and 2023 transfers.
    out = _send(
        client,
        _j19_twin(filed_on="2025-03-03", requested_start="2025-06-01", outcome="pending"),
    )
    _assert_only_the_grace(out)


def test_point_22b_j19_twin_g_no_start_only_the_grace_carries_the_step_back(
    client: TestClient,
) -> None:
    # Twin G: approved, neither start entered. Point 23a asks h9.validity_start and point 19
    # steps back until it is answered, so grace.p2 is nulled by the petition member.
    # Kills: the step back on the transfers while the start is asked.
    out = _send(client, _j19_twin(filed_on="2026-04-01", outcome="approved"))
    assert "h9.validity_start" in question_ids(out)
    _assert_only_the_grace(out)


def test_point_22b_j19_a_2020_petition_puts_the_step_back_on_no_stage(client: TestClient) -> None:
    # 2020-10-01 is before 2025-05-17, 2025-06-09 and 2026-06-09, so point 23a takes nothing and
    # grace.p2 keeps 2028-06-08 plus 60 = 2028-08-07, later.
    # Kills: the step back on a stage because a petition exists, whatever its start.
    out = _send(
        client,
        _j19_twin(
            filed_on="2020-04-01",
            requested_start="2020-10-01",
            outcome="approved",
            outcome_on="2020-06-01",
            validity_start="2020-10-01",
        ),
    )
    assert _carrying_the_step_back(out) == []
    assert _row(out, "grace.p2") == ("2028-06-09", "2028-08-07", "later")


# The three mutants of review fix7 finding 2, named in point 22b. J15 plus a petition filed
# 2020-04-01 starting 2020-10-01: the start is before a1's start 2024-06-15 and a2's start
# 2025-06-15, so point 23a takes nothing from either card, and J15 is computed as without it.


def _j15_2020() -> dict[str, Any]:
    return _with_petition(
        journeys.j15(),
        type="h1b",
        cap_subject="yes",
        filed_on="2020-04-01",
        requested_start="2020-10-01",
        outcome="approved",
        outcome_on="2020-06-01",
        validity_start="2020-10-01",
    )


def test_point_22b_mutant_job_anchor_any_petition_job_b_keeps_its_final_evaluation(
    client: TestClient,
) -> None:
    # Job B (w3 under a2) ends 2025-10-31. Plus 10 days: Nov 1 (1) ... Nov 10 (10), so the
    # final evaluation is 2025-10-31 to 2025-11-10, as in plain J15.
    # Kills: job_anchor_any_petition, the point 23 filter on stem_job_end.evaluation_final
    # made true for any petition (it nulls this window).
    out = _send(client, _j15_2020())
    assert window(out, "stem_job_end.evaluation_final.w3") == ("2025-10-31", "2025-11-10")
    assert _carrying_the_step_back(out) == []
    assert STEP_BACK not in reasons(out)


def test_point_22b_mutant_unemp_anchor_removed_the_total_stays_116(client: TestClient) -> None:
    # unemployment.total.a1 on 2026-09-29: 86 on the OPT card (2024-06-15 to 08-19 is
    # 16 + 31 + 19 = 66, and 2025-04-01 to 04-20 is 20) plus 30 on the STEM card (Job B ends
    # 2025-10-31, Job C starts 2025-12-01: November 1 to 30), 116, the same as plain J15.
    # Kills: unemp_anchor_removed, *petition_may_extend_card taken off the unemployment span
    # (it nulls the total for any petition).
    plain = _send(client, journeys.j15())
    out = _send(client, _j15_2020())
    assert value(out, "unemployment.total.a1") == 116
    assert value(out, "unemployment.total.a1") == value(plain, "unemployment.total.a1")


def test_point_22b_mutant_windowless_span_j11_job_end_stays_done(client: TestClient) -> None:
    # J11 w1 ends 2026-02-27; the report window is 2026-02-27 plus 10 days, Feb 28 (1), Mar 1
    # (2) ... Mar 9 (10): 2026-02-27 to 2026-03-09, closed before 2026-09-29. The stage has no
    # span of its own, so it is placed by its windows: done.
    # Kills: engine_windowless_span_current, the window-based placement of a stage with no
    # span turned off (the stage goes to unknown).
    out = _send(client, journeys.j11())
    assert window(out, "opt_job_end.report.w1") == ("2026-02-27", "2026-03-09")
    assert stage(out, "opt_job_end.w1")["state"] == "done"


def test_point_22b_mutant_windowless_span_j15_job_ends_stay_done(client: TestClient) -> None:
    # J15 w2 ends 2025-06-14: report 2025-06-14 to 2025-06-24 (Jun 15 (1) ... Jun 24 (10)).
    # J15 w3 ends 2025-10-31: report and final evaluation 2025-10-31 to 2025-11-10. Both closed
    # before 2026-09-29, so both stages are done.
    # Kills: engine_windowless_span_current (both go to unknown).
    out = _send(client, journeys.j15())
    assert window(out, "opt_job_end.report.w2") == ("2025-06-14", "2025-06-24")
    assert window(out, "stem_job_end.report.w3") == ("2025-10-31", "2025-11-10")
    assert stage(out, "opt_job_end.w2")["state"] == "done"
    assert stage(out, "stem_job_end.w3")["state"] == "done"
