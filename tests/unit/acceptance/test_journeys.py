"""The twenty journeys of specs/path-1/journeys.json, each sent through POST /v1/compute.

Specified in specs/product-2/resolutions.md points 1 and 2: POST /v1/compute calls
engine/path.py on the records case, and each journey is a case "sent through POST
/v1/compute with the answers a student would give, each asserting the stages, dates, counts
and verdict its timeline and rules give" (specs/path-1/programs.md section 22). The record
kinds and fields are programs.md section 10; the F-1 path is section 14; the rule amounts
are the rows of rulepacks/f1-us/v2026.09/parameters.yaml, whose quotes the source check
holds to the saved words.

Each case holds what the journey's timeline states and nothing more: a field the journey
does not give is left out (programs.md section 10, "A field left out is not known"). Each
expected date is the journey's own line, worked out again by hand beside the assertion.
Today is 2026-09-29 in America/New_York, through an injected FixedClock.

Until the build round wires /v1/compute to engine/path.py, every test here fails: the route
answers category_not_covered:f1 with no stages (reviews/product-2.md finding 1).
"""

import re
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock
from tests.support.api_client import CheckedClient
from tests.support.records_case import (
    CLOCK,
    case,
    question_ids,
    reasons,
    rec,
    stage,
    stage_ids,
    value,
    whole,
    window,
)

URL = "/v1/compute"


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


def _dated_after(out: dict[str, Any], prefix: str, card: str, day: str) -> list[str]:
    """Ids of the windows `<prefix>_<n>.<card>` that open or close after `day`."""
    return [
        w["id"]
        for s in out["stages"]
        for w in s["windows"]
        if w["id"].startswith(prefix)
        and w["id"].endswith("." + card)
        and any(d is not None and d > day for d in (w["opens"], w["closes"]))
    ]


def _report_dates(out: dict[str, Any], card: str) -> list[tuple[str, Any, Any]]:
    """The validation and evaluation windows of `stem.<card>` that hold a date."""
    return [
        (w["id"], w["opens"], w["closes"])
        for w in stage(out, "stem." + card)["windows"]
        if w["id"].startswith(("stem.validation_", "stem.evaluation_"))
        and (w["opens"] is not None or w["closes"] is not None)
    ]


def _final_evaluations(out: dict[str, Any]) -> list[tuple[Any, Any]]:
    """(opens, closes) of every final evaluation window, whatever it is keyed by."""
    return [
        (w["opens"], w["closes"])
        for s in out["stages"]
        for w in s["windows"]
        if "evaluation_final" in w["id"]
    ]


# Resolutions point 19: while cap-gap waits for its own round, a case holding a
# change-of-status petition steps back. The items the petition could change are null (the
# grace of the program and card it could follow, every validation and evaluation from its
# filing onward, the unemployment count from that day, any cap-gap stage), and the verdict
# carries the judgement item cap_gap.for_dso (talk_to_dso). "No petition opens a stage, raises
# a conflict, or takes a date away on its own." The verdict state may be cannot_tell rather
# than talk_to_dso: each journey also leaves typed dates unconfirmed (D59), and not knowing
# wins over a judgement item (CLAUDE.md, a verdict never falls back to the quiet state).

STEP_BACK = "cap_gap.for_dso"


def _not_the_step_back(out: dict[str, Any], petition: str) -> list[str]:
    """What departs from point 19's step back in a case holding the petition `petition`."""
    wrong: list[str] = []
    if STEP_BACK not in reasons(out):
        wrong.append("no " + STEP_BACK)
    if out["verdict"]["state"] not in ("talk_to_dso", "cannot_tell"):
        wrong.append("verdict " + out["verdict"]["state"])
    wrong += ["stage " + i for i in stage_ids(out) if i.startswith("cap_gap.")]
    wrong += [
        "reason " + r
        for r in reasons(out)
        if r != STEP_BACK
        and ("cap_gap" in r or (r.startswith("conflict:") and petition in re.split("[:.]", r)))
    ]
    wrong += ["question " + q for q in question_ids(out) if q.startswith("cap_gap.")]
    return wrong


def _reports_dated_from(out: dict[str, Any], day: str) -> list[str]:
    """Ids of the STEM validation and evaluation windows holding a date on or after `day`."""
    return [
        w["id"]
        for s in out["stages"]
        for w in s["windows"]
        if w["id"].startswith(("stem.validation_", "stem.evaluation_", "stem_job_end.evaluation_"))
        and any(d is not None and d >= day for d in (w["opens"], w["closes"]))
    ]


def _grace_dated(out: dict[str, Any]) -> list[tuple[str, Any, Any]]:
    """Every grace stage that holds a date. A null grace holds none, or is not shown."""
    return [
        (s["id"], s["starts"], s["ends"])
        for s in out["stages"]
        if s["id"].startswith("grace.") and (s["starts"] is not None or s["ends"] is not None)
    ]


def _null_or_absent(out: dict[str, Any], item_id: str) -> bool:
    return all(i["value"] is None for i in out["computed"] if i["id"] == item_id)


# The cases. Each is the journey's timeline as records; the answers a student would give.


def j01() -> dict[str, Any]:
    # programs.md "J01 as a case under the new contract", with the jobs of the timeline.
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="bachelor",
                field_name="Economics",
                stem_list="not_on_list",
                start_date="2019-08-26",
                end_date="2023-05-12",
                state="completed",
                conferred_on="2023-05-20",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School B",
                level="master",
                field_name="Computer Science",
                stem_list="on_list",
                start_date="2024-08-26",
                end_date="2026-05-15",
                state="completed",
            ),
            rec(
                "mv1",
                "move",
                how="transfer",
                from_program="p1",
                to_program="p2",
                release_date="2024-07-15",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                dso_on="2023-03-01",
                filed_on="2023-03-10",
                decision="approved",
                card_start="2023-06-19",
                card_end="2024-06-18",
            ),
            rec(
                "a2",
                "authorization",
                type="opt_post_completion",
                program="p2",
                decision="approved",
                card_start="2026-06-15",
                card_end="2027-06-14",
            ),
            rec("e1", "employer", name="Employer One"),
            rec("e2", "employer", name="Employer Two", e_verify="yes"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2023-08-07",
                end="2024-06-18",
                hours_per_week=40,
            ),
            rec("w2", "work", employer="e2", under="a2", start="2026-08-01", hours_per_week=40),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move", "work", "trip"),
    )


def j02() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="bachelor",
                field_name="Computer Science",
                stem_list="on_list",
                start_date="2014-08-25",
                end_date="2018-05-11",
                state="completed",
                conferred_on="2018-05-19",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School B",
                level="master",
                field_name="MBA",
                stem_list="not_on_list",
                start_date="2024-08-26",
                end_date="2025-12-12",
                state="completed",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p2",
                decision="approved",
                card_start="2026-01-20",
                card_end="2027-01-19",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2"),
    )


def j03() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Management",
                stem_list="not_on_list",
                start_date="2022-08-22",
                end_date="2023-12-15",
                state="completed",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School B",
                level="master",
                field_name="Business Analytics",
                stem_list="on_list",
                start_date="2024-08-26",
                end_date="2026-05-08",
                state="completed",
            ),
            rec(
                "mv1",
                "move",
                how="transfer",
                from_program="p1",
                to_program="p2",
                release_date="2024-07-22",
            ),
            rec(
                "a1",
                "authorization",
                type="cpt",
                program="p1",
                time="full_time",
                card_start="2023-05-22",
                card_end="2023-08-11",
            ),
            rec(
                "a2",
                "authorization",
                type="opt_post_completion",
                program="p1",
                dso_on="2023-11-01",
                decision="approved",
                card_start="2024-01-22",
                card_end="2024-07-21",
                split_noted="yes",
            ),
            rec(
                "a3",
                "authorization",
                type="cpt",
                program="p2",
                time="full_time",
                card_start="2025-05-19",
                card_end="2025-08-15",
            ),
            rec(
                "a4",
                "authorization",
                type="opt_post_completion",
                program="p2",
                decision="approved",
                card_start="2026-06-01",
                card_end="2026-11-30",
                split_noted="yes",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move", "trip"),
    )


def j04() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Chemistry",
                stem_list="on_list",
                start_date="2018-08-20",
                end_date="2020-05-15",
                state="completed",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School B",
                level="doctorate",
                field_name="Chemistry",
                start_date="2022-08-22",
                end_date="2027-05-14",
                state="in_progress",
                coursework_done_on="2025-05-09",
            ),
            rec(
                "ec1",
                "end_date_change",
                program="p2",
                change="extension",
                old_end="2026-05-15",
                new_end="2027-05-14",
                requested_on="2026-04-01",
                granted_on="2026-04-10",
                reason="academic",
            ),
            rec(
                "mv1",
                "move",
                how="transfer",
                from_program="p1",
                to_program="p2",
                release_date="2022-08-15",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                decision="approved",
                card_start="2020-06-22",
                card_end="2021-06-21",
            ),
            rec(
                "a2",
                "authorization",
                type="stem_extension",
                program="p1",
                extends="a1",
                basis_program="p1",
                decision="approved",
                card_start="2021-06-22",
                card_end="2023-06-21",
            ),
            rec(
                "a3",
                "authorization",
                type="cpt",
                program="p2",
                time="full_time",
                card_start="2024-05-20",
                card_end="2024-08-09",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move", "end_date_change", "trip"),
    )


def j05() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Electrical Engineering",
                stem_list="on_list",
                start_date="2024-08-26",
                end_date="2026-05-15",
                state="completed",
                first_year_done_on="2025-05-09",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_pre_completion",
                program="p1",
                time="full_time",
                dso_on="2025-02-20",
                filed_on="2025-03-05",
                decision="approved",
                card_start="2025-05-19",
                card_end="2025-08-15",
            ),
            rec(
                "a2",
                "authorization",
                type="opt_pre_completion",
                program="p1",
                time="part_time",
                dso_on="2025-06-25",
                filed_on="2025-07-10",
                decision="approved",
                card_start="2025-09-02",
                card_end="2025-12-19",
            ),
            rec(
                "a3",
                "authorization",
                type="opt_post_completion",
                program="p1",
                dso_on="2026-02-20",
                filed_on="2026-03-02",
                decision="approved",
                card_start="2026-06-08",
                card_end="2027-01-14",
            ),
        ],
        whole("program", "authorization:p1", "trip"),
    )


def j06() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Mechanical Engineering",
                start_date="2023-08-21",
                end_date="2025-12-12",
                state="completed",
                first_year_done_on="2024-05-09",
            ),
            rec(
                "a1",
                "authorization",
                type="cpt",
                program="p1",
                time="full_time",
                employer="e1",
                card_start="2024-05-20",
                card_end="2024-08-16",
            ),
            rec(
                "a2",
                "authorization",
                type="cpt",
                program="p1",
                time="full_time",
                employer="e1",
                card_start="2024-08-19",
                card_end="2024-12-20",
            ),
            rec(
                "a3",
                "authorization",
                type="cpt",
                program="p1",
                time="full_time",
                employer="e2",
                card_start="2025-01-06",
                card_end="2025-05-16",
            ),
            rec(
                "a4",
                "authorization",
                type="cpt",
                program="p1",
                time="full_time",
                employer="e2",
                card_start="2025-05-19",
                card_end="2025-06-13",
            ),
            rec(
                "a5",
                "authorization",
                type="cpt",
                program="p1",
                time="part_time",
                employer="e2",
                card_start="2025-08-25",
                card_end="2025-12-12",
            ),
            rec("e1", "employer", name="Employer X"),
            rec("e2", "employer", name="Employer Y"),
        ],
        whole("program", "authorization:p1"),
    )


def j07() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="bachelor",
                field_name="Computer Science",
                start_date="2023-08-21",
                state="completed",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School B",
                level="bachelor",
                field_name="Computer Science",
                start_date="2025-08-25",
                end_date="2027-05-14",
                state="in_progress",
            ),
            rec(
                "mv1",
                "move",
                how="transfer",
                from_program="p1",
                to_program="p2",
                told_school_on="2025-03-01",
                release_date="2025-05-09",
            ),
            rec(
                "a1",
                "authorization",
                type="cpt",
                program="p1",
                time="full_time",
                card_start="2024-05-20",
                card_end="2024-08-09",
            ),
            rec(
                "a2",
                "authorization",
                type="cpt",
                program="p2",
                time="full_time",
                card_start="2026-05-18",
                card_end="2026-08-07",
            ),
            rec(
                "w1",
                "work",
                on_campus="p1",
                start="2024-09-03",
                end="2025-05-09",
                hours_per_week=20,
            ),
            rec(
                "t1",
                "trip",
                left_on="2025-06-01",
                returned_on="2025-08-15",
                purpose="personal",
                reentry_i20="p2",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move", "work", "trip"),
    )


def j08(trips_whole: bool = True) -> dict[str, Any]:
    # reviews/product-2.md finding 2 names this input. The timeline holds every trip (none),
    # so the student states the trip list whole (resolutions point 13); False leaves it out.
    trips = ("trip",) if trips_whole else ()
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="bachelor",
                field_name="Mathematics",
                stem_list="on_list",
                start_date="2020-08-24",
                end_date="2024-05-10",
                state="completed",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Statistics",
                start_date="2025-01-13",
                end_date="2026-12-18",
                state="in_progress",
            ),
            rec("mv1", "move", how="change_of_level", from_program="p1", to_program="p2"),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                decision="approved",
                card_start="2024-06-03",
                card_end="2025-06-02",
            ),
            rec("e1", "employer", name="Employer One"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2024-07-08",
                end="2025-01-12",
                hours_per_week=40,
            ),
            rec("w2", "work", on_campus="p2", start="2025-01-13", hours_per_week=20),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move", "work", *trips),
    )


def j09(requested_on: str = "2025-04-21") -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Environmental Engineering",
                start_date="2023-08-21",
                end_date="2025-12-19",
                state="completed",
            ),
            rec(
                "ec1",
                "end_date_change",
                program="p1",
                change="extension",
                old_end="2025-05-16",
                new_end="2025-12-19",
                requested_on=requested_on,
                granted_on="2025-04-28",
                reason="academic",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                dso_on="2025-10-01",
                filed_on="2025-10-15",
                decision="approved",
                card_start="2026-01-12",
                card_end="2027-01-11",
            ),
        ],
        whole("program", "authorization:p1", "end_date_change", "trip"),
    )


def j10() -> dict[str, Any]:
    # Case A: the transfer that fits the words.
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Physics",
                start_date="2023-08-21",
                end_date="2025-05-16",
                state="completed",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School B",
                level="doctorate",
                field_name="Physics",
                start_date="2025-08-25",
                state="in_progress",
            ),
            rec(
                "mv1",
                "move",
                how="transfer",
                from_program="p1",
                to_program="p2",
                release_date="2025-06-30",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move"),
    )


def j11() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Marketing",
                end_date="2025-08-15",
                state="completed",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                decision="approved",
                card_start="2025-10-01",
                card_end="2026-09-30",
            ),
            rec("e1", "employer", name="Employer One"),
            rec("e2", "employer", name="Employer Two"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2025-10-15",
                end="2026-02-27",
                hours_per_week=40,
            ),
            rec("w2", "work", employer="e2", under="a1", start="2026-05-11", hours_per_week=40),
            rec(
                "t1",
                "trip",
                left_on="2025-12-18",
                returned_on="2026-01-05",
                purpose="approved_leave",
                reentry_i20="p1",
                signature_on="2025-09-10",
                job_on_return="yes",
            ),
            rec(
                "t2",
                "trip",
                left_on="2026-03-10",
                returned_on="2026-04-20",
                purpose="personal",
                reentry_i20="p1",
                signature_on="2026-03-02",
                job_on_return="no",
            ),
        ],
        whole("program", "authorization:p1", "work", "trip", "petition"),
    )


def j12() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Marketing",
                stem_list="not_on_list",
                end_date="2025-05-16",
                state="completed",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                decision="approved",
                card_start="2025-06-01",
                card_end="2026-05-31",
            ),
            rec("e1", "employer", name="Employer One"),
            rec("w1", "work", employer="e1", under="a1", start="2025-06-01", hours_per_week=40),
            rec(
                "h1",
                "petition",
                type="h1b",
                cap_subject="yes",
                employer="e1",
                filed_on="2026-04-01",
                requested_start="2026-10-01",
                change_of_status="yes",
                outcome="approved",
                outcome_on="2026-06-20",
                validity_start="2026-10-01",
            ),
        ],
        whole("program", "authorization:p1", "work", "petition", "trip"),
    )


def j13() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Finance",
                stem_list="not_on_list",
                end_date="2025-05-16",
                state="completed",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                decision="approved",
                card_start="2025-07-01",
                card_end="2026-06-30",
            ),
            rec("e1", "employer", name="Employer One"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2025-07-01",
                end="2026-08-14",
                hours_per_week=40,
            ),
            rec(
                "h1",
                "petition",
                type="h1b",
                cap_subject="yes",
                employer="e1",
                filed_on="2026-04-01",
                requested_start="2026-10-01",
                change_of_status="yes",
                outcome="denied",
                outcome_on="2026-08-14",
            ),
        ],
        whole("program", "authorization:p1", "work", "petition", "trip"),
    )


def j14() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Computer Science",
                stem_list="on_list",
                end_date="2023-05-12",
                state="completed",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                decision="approved",
                card_start="2023-06-01",
                card_end="2024-05-31",
            ),
            rec(
                "a2",
                "authorization",
                type="stem_extension",
                program="p1",
                extends="a1",
                basis_program="p1",
                employer="e2",
                decision="approved",
                card_start="2024-06-01",
                card_end="2026-05-31",
            ),
            rec("e1", "employer", name="Employer One"),
            rec("e2", "employer", name="Employer Z", e_verify="yes"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2023-07-11",
                end="2024-05-31",
                hours_per_week=40,
            ),
            rec(
                "w2",
                "work",
                employer="e2",
                under="a2",
                start="2024-07-06",
                end="2026-07-15",
                hours_per_week=40,
            ),
            rec(
                "h1",
                "petition",
                type="h1b",
                cap_subject="yes",
                employer="e2",
                filed_on="2026-04-01",
                requested_start="2026-10-01",
                change_of_status="yes",
                outcome="withdrawn",
                outcome_on="2026-07-25",
            ),
        ],
        whole("program", "authorization:p1", "work", "petition", "trip"),
    )


def j15(job_c_end: str | None = None) -> dict[str, Any]:
    # job_c_end gives Job C an end, so every job under the STEM card has ended (resolutions
    # point 16, "A job's end does not end validations"); None is the journey as written.
    job_c_ends = {} if job_c_end is None else {"end": job_c_end}
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Data Science",
                stem_list="on_list",
                end_date="2024-05-10",
                state="completed",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                filed_on="2024-04-15",
                decision="approved",
                card_start="2024-06-15",
                card_end="2025-06-14",
            ),
            rec(
                "a2",
                "authorization",
                type="stem_extension",
                program="p1",
                extends="a1",
                basis_program="p1",
                dso_on="2025-04-25",
                filed_on="2025-05-02",
                decision="approved",
                decided_on="2025-07-20",
                card_start="2025-06-15",
                card_end="2027-06-14",
            ),
            rec("e1", "employer", name="Job A"),
            rec("e2", "employer", name="Job B", e_verify="yes"),
            rec("e3", "employer", name="Job C", e_verify="yes"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2024-08-20",
                end="2025-03-31",
                hours_per_week=40,
            ),
            rec(
                "w2",
                "work",
                employer="e2",
                under="a1",
                start="2025-04-21",
                end="2025-06-14",
                hours_per_week=40,
            ),
            rec(
                "w3",
                "work",
                employer="e2",
                under="a2",
                start="2025-06-15",
                end="2025-10-31",
                hours_per_week=40,
            ),
            rec(
                "w4",
                "work",
                employer="e3",
                under="a2",
                start="2025-12-01",
                **job_c_ends,
                hours_per_week=40,
                hours_changes=[{"start": "2026-01-05", "end": "2026-01-25", "hours_per_week": 15}],
            ),
        ],
        whole("program", "authorization:p1", "work", "trip"),
    )


def j16() -> dict[str, Any]:
    return case(
        [
            rec(
                "p0",
                "program",
                where="outside_us",
                school_name="A university in India",
                level="bachelor",
                field_name="Mechanical Engineering",
                state="completed",
                conferred_on="2021-06-30",
            ),
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="MBA",
                stem_list="not_on_list",
                start_date="2024-08-26",
                end_date="2026-05-15",
                state="completed",
                first_year_done_on="2025-05-09",
            ),
            rec(
                "a1",
                "authorization",
                type="cpt",
                program="p1",
                time="full_time",
                card_start="2025-05-19",
                card_end="2025-08-08",
            ),
            rec(
                "a2",
                "authorization",
                type="opt_post_completion",
                program="p1",
                decision="approved",
                card_start="2026-06-15",
                card_end="2027-06-14",
            ),
            rec(
                "t1",
                "trip",
                left_on="2025-09-02",
                returned_on="2026-01-12",
                purpose="study_abroad",
                reentry_i20="p1",
            ),
        ],
        whole("program", "authorization:p0", "authorization:p1", "trip"),
    )


def j17() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="bachelor",
                field_name="Business Administration",
                start_date="2023-08-21",
                end_date="2026-12-18",
                state="in_progress",
                full_course_each_term="no",
                online_within_limit="not_sure",
            ),
        ],
        whole("program", "authorization:p1"),
    )


def j18() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="bachelor",
                field_name="Biology",
                start_date="2024-08-26",
                end_date="2027-12-17",
                state="in_progress",
            ),
            rec(
                "ec1",
                "end_date_change",
                program="p1",
                change="extension",
                old_end="2027-05-14",
                new_end="2027-12-17",
                granted_on="2026-08-20",
                reason="medical",
            ),
        ],
        whole("program", "authorization:p1", "end_date_change"),
    )


def j19() -> dict[str, Any]:
    return case(
        [
            rec(
                "p0",
                "program",
                where="us_on_f1",
                school_name="School L",
                level="language_training",
                field_name="English",
                start_date="2021-01-11",
                end_date="2021-08-06",
                state="completed",
            ),
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="College M",
                level="associate",
                field_name="Computer Science",
                start_date="2021-08-23",
                end_date="2023-05-19",
                state="completed",
                first_year_done_on="2022-05-13",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="University N",
                level="bachelor",
                field_name="Computer Science",
                stem_list="on_list",
                start_date="2023-08-21",
                end_date="2025-05-16",
                state="completed",
            ),
            rec(
                "mv1",
                "move",
                how="transfer",
                from_program="p0",
                to_program="p1",
                release_date="2021-08-06",
            ),
            rec(
                "mv2",
                "move",
                how="transfer",
                from_program="p1",
                to_program="p2",
                release_date="2023-06-15",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p2",
                decision="approved",
                card_start="2025-06-09",
                card_end="2026-06-08",
            ),
            rec(
                "a2",
                "authorization",
                type="stem_extension",
                program="p2",
                extends="a1",
                basis_program="p2",
                decision="approved",
                card_start="2026-06-09",
                card_end="2028-06-08",
            ),
        ],
        whole(
            "program", "authorization:p0", "authorization:p1", "authorization:p2", "move", "trip"
        ),
    )


def j20() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="MBA",
                stem_list="not_on_list",
                start_date="2024-08-26",
                end_date="2026-05-15",
                state="completed",
                dual_with="p2",
                coursework_done_on="2026-05-15",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Computer Science",
                stem_list="on_list",
                start_date="2024-08-26",
                end_date="2026-12-18",
                state="in_progress",
                dual_with="p1",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                filed_on="2026-03-02",
                decision="approved",
                card_start="2026-06-15",
                card_end="2027-06-14",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "trip"),
    )


JOURNEYS: dict[str, Callable[[], dict[str, Any]]] = {
    "J01": j01,
    "J02": j02,
    "J03": j03,
    "J04": j04,
    "J05": j05,
    "J06": j06,
    "J07": j07,
    "J08": j08,
    "J09": j09,
    "J10": j10,
    "J11": j11,
    "J12": j12,
    "J13": j13,
    "J14": j14,
    "J15": j15,
    "J16": j16,
    "J17": j17,
    "J18": j18,
    "J19": j19,
    "J20": j20,
}


# Every journey: resolution point 1 and PRINCIPLES (a verdict never falls back to quiet).


@pytest.mark.parametrize("jid", sorted(JOURNEYS))
def test_every_journey_reaches_the_path_engine_through_the_api(
    client: TestClient, jid: str
) -> None:
    # resolutions point 1: POST /v1/compute calls engine/path.py on the records case. Fails
    # while api/case.py answers category_not_covered:f1 with no stages (finding 1).
    out = _send(client, JOURNEYS[jid]())
    assert "category_not_covered:f1" not in reasons(out)
    assert out["stages"], "the path engine enters at least one stage for every journey"


@pytest.mark.parametrize("jid", sorted(JOURNEYS))
def test_no_journey_is_answered_with_no_open_items(client: TestClient, jid: str) -> None:
    # CLAUDE.md: missing, stale, conflicting or litigated means cannot_tell. Every journey
    # leaves typed dates unconfirmed (programs.md section 12 and 17), so none is quiet.
    out = _send(client, JOURNEYS[jid]())
    assert out["verdict"]["state"] != "no_open_items"


# J01


def test_j01_each_program_has_its_own_opt_windows(client: TestClient) -> None:
    # journeys.json J01 rule 2; (f)(11)(i)(B)(2): opt.apply_before_days 90, apply_after 60.
    # p1 end 2023-05-12. Minus 90: 04-12 (30), 03-13 (60), 02-11 (90). Plus 60: 05-31 (19),
    # 06-30 (49), 07-11 (60). Complete by: plus 14 months, 2024-07-12.
    # p2 end 2026-05-15. Minus 90: 04-15, 03-16, 02-14. Plus 60: 05-31 (16), 06-30 (46),
    # 07-14 (60). Complete by: 2027-07-15.
    out = _send(client, j01())
    assert window(out, "opt.apply_window.a1") == ("2023-02-11", "2023-07-11")
    assert window(out, "opt.complete_by.a1")[1] == "2024-07-12"
    assert window(out, "opt.apply_window.a2") == ("2026-02-14", "2026-07-14")
    assert window(out, "opt.complete_by.a2")[1] == "2027-07-15"


def test_j01_stem_window_of_the_masters_card_opens_90_days_before_its_end(
    client: TestClient,
) -> None:
    # J01 timeline: "2027-03-16 STEM extension filing window opens (card end minus 90 days)".
    # a2 card end 2027-06-14. Minus 90: 05-15 (30), 04-15 (60), 03-16 (90).
    out = _send(client, j01())
    assert window(out, "stem.apply_window.a2")[0] == "2027-03-16"
    assert stage(out, "stem.a2")["state"] == "next"


def test_j01_unemployment_is_counted_per_card(client: TestClient) -> None:
    # J01 rule 3, (f)(10)(ii)(E) and guidance 1004-03 7.1.4: each card its own 90 days.
    # a1: 2023-06-19 to 2023-08-06 without work: June 19-30 (12), July (31), Aug 1-6 (6) = 49.
    # a2: 2026-06-15 to 2026-07-31: June 15-30 (16), July (31) = 47. Work stated whole.
    out = _send(client, j01())
    assert value(out, "unemployment.opt_card.a1") == 49
    assert value(out, "unemployment.opt_card.a2") == 47


def test_j01_the_bachelors_stem_step_is_not_next_after_its_window_closed(
    client: TestClient,
) -> None:
    # resolutions point 6, finding 5: stem.a1's window closed with the card on 2024-06-18.
    out = _send(client, j01())
    assert all(s["state"] != "next" for s in out["stages"] if s["id"] == "stem.a1")


def test_j01_the_next_stem_stage_carries_no_report_dates(client: TestClient) -> None:
    # resolutions point 16, 8 CFR 214.2(f)(12)(ii)(B): validation reporting "starts on the
    # date the 24-month OPT extension begins". stem.a2 is next (window from 2027-03-16) and
    # no STEM card exists, so no validation or evaluation of it holds a date. The fix 2 run
    # gave validation_1 2026-12-15 to 12-30 (OPT card start 2026-06-15 plus 6 months) and a
    # concluding evaluation 2027-06-14 to 06-24 (reviews/product-2-fix2.md finding 1).
    out = _send(client, j01())
    assert stage(out, "stem.a2")["state"] == "next"
    assert _report_dates(out, "a2") == []


# J02


def test_j02_windows_of_the_mba_card(client: TestClient) -> None:
    # p2 end 2025-12-12. Minus 90: 11-12 (30), 10-13 (60), 09-13 (90). Plus 60: 12-31 (19),
    # 01-31 (50), 02-10 (60): the journey's 2025-09-13 to 2026-02-10.
    # STEM: card end 2027-01-19 minus 90: 12-20 (30), 11-20 (60), 10-21 (90).
    out = _send(client, j02())
    assert window(out, "opt.apply_window.a1") == ("2025-09-13", "2026-02-10")
    assert window(out, "stem.apply_window.a1")[0] == "2026-10-21"


def test_j02_stem_on_the_earlier_bachelors_is_next(client: TestClient) -> None:
    # programs.md section 14, candidate basis: p1 us_on_f1, bachelor, on_list, conferred
    # 2018-05-19, which is on or after 2026-10-21 minus 60 days (2026-08-22) minus 10 years
    # (2016-08-22). So a STEM extension of a1 is next.
    out = _send(client, j02())
    assert stage(out, "stem.a1")["state"] == "next"


def test_j02_the_next_stem_stage_carries_no_report_dates(client: TestClient) -> None:
    # resolutions point 16: stem.a1 is next and no STEM card exists. The fix 2 run gave
    # validation_1 2026-07-20 to 08-03 (OPT card start 2026-01-20 plus 6 months), a window
    # already past on a stage not yet applied for, and an evaluation from 2027-01-19.
    out = _send(client, j02())
    assert _report_dates(out, "a1") == []


# The ten years after the bachelor's (stem.basis_ten_years_end.p1, 2018-05-19 plus 10 years
# is 2028-05-19) waits for a contract construct for a computed date in the path, and its
# test waits with it (resolutions points 7 and 13).


# J03


def test_j03_full_time_cpt_at_the_masters_level_is_171_days(client: TestClient) -> None:
    # 2023-05-22 to 2023-08-11: May 22-31 (10), June (30), July (31), Aug 1-11 (11) = 82.
    # 2025-05-19 to 2025-08-15: May 19-31 (13), June (30), July (31), Aug 1-15 (15) = 89.
    # Same level at two schools (programs.md section 11): 82 + 89 = 171.
    out = _send(client, j03())
    assert value(out, "cpt.full_time_days_at_level.master") == 171


def test_j03_two_six_month_cards_use_the_twelve_months_at_the_masters_level(
    client: TestClient,
) -> None:
    # 2024-01-22 to 2024-07-21 is 6 whole months; 2026-06-01 to 2026-11-30 is 6 whole months.
    out = _send(client, j03())
    assert value(out, "opt.months_at_level.master") == 12


def test_j03_second_card_windows(client: TestClient) -> None:
    # p2 end 2026-05-08. Minus 90: 04-08 (30), 03-09 (60), 02-07 (90). Plus 60: 05-31 (23),
    # 06-30 (53), 07-07 (60). STEM: a4 end 2026-11-30 minus 90: 10-31 (30), 10-01 (60),
    # 09-01 (90), the journey's "2026-09-01 STEM filing window opens".
    out = _send(client, j03())
    assert window(out, "opt.apply_window.a4") == ("2026-02-07", "2026-07-07")
    assert window(out, "stem.apply_window.a4")[0] == "2026-09-01"


def test_j03_the_next_stem_stage_carries_no_report_dates(client: TestClient) -> None:
    # resolutions point 16: stem.a4 is next (window from 2026-09-01) and no STEM card exists.
    # The fix 2 run gave a concluding evaluation 2026-11-30 to 12-10 from the OPT card end.
    out = _send(client, j03())
    assert _report_dates(out, "a4") == []


def test_j03_cpt_is_not_asked_for_a_decision(client: TestClient) -> None:
    # programs.md section 10: decision is asked for "all but cpt" (finding 9, point 8).
    out = _send(client, j03())
    assert "a1.decision" not in question_ids(out)
    assert "a3.decision" not in question_ids(out)


# J04


def test_j04_the_stem_card_ends_on_the_transfer_release_date(client: TestClient) -> None:
    # programs.md section 11: a move ends the authorization; for a transfer Duly reads the
    # release date (2022-08-15), and SEVP's guidance gives the same day.
    out = _send(client, j04())
    assert stage(out, "stem.a2")["ends"] == "2022-08-15"


def test_j04_doctoral_cpt_is_counted_at_the_doctoral_level_only(client: TestClient) -> None:
    # 2024-05-20 to 2024-08-09: May 20-31 (12), June (30), July (31), Aug 1-9 (9) = 82.
    out = _send(client, j04())
    assert value(out, "cpt.full_time_days_at_level.doctorate") == 82
    assert stage(out, "program.p2")["ends"] == "2027-05-14"


def test_j04_doctoral_opt_is_next_with_its_window(client: TestClient) -> None:
    # Section 14: opt_post is next for p2 (doctorate, no OPT on it). End in force 2027-05-14.
    # Minus 90: 04-14 (30), 03-15 (60), 02-13 (90): the journey's 2027-02-13.
    out = _send(client, j04())
    assert stage(out, "opt_post.p2")["state"] == "next"
    assert window(out, "opt.apply_window.p2")[0] == "2027-02-13"


def test_j04_the_concluding_evaluation_is_dated_from_the_release_date(client: TestClient) -> None:
    # resolutions point 15, (f)(10)(ii)(C)(9)(i): the final evaluation is due "no later than
    # 10 days following the conclusion of his or her practical training opportunity"
    # (stem.evaluation_due_days 10). The STEM card a2 ends on the release date 2022-08-15
    # (J04: "Final I-983 evaluation for the job ending that day due by 2022-08-25").
    # 2022-08-15 plus 10: Aug 16 (1) ... Aug 25 (10). Not the printed card end 2023-06-21,
    # which gave 2023-06-21 to 2023-07-01 (reviews/product-2-fix1.md finding 1).
    out = _send(client, j04())
    assert window(out, "stem.evaluation_final.a2") == ("2022-08-15", "2022-08-25")


def test_j04_no_validation_is_dated_after_the_stem_card_ended(client: TestClient) -> None:
    # resolutions point 16 (correcting point 15's "or the training ends"), 8 CFR
    # 214.2(f)(12)(ii)(B): validation reporting "ends when the student's F-1 status expires or
    # the 24-month OPT extension concludes, whichever is first"; the release ends the card.
    # a2 starts 2021-06-22 and ends 2022-08-15. Validations every 6 months from the start:
    # 2021-12-22, 2022-06-22, 2022-12-22 and 2023-06-22. The last two lie after 2022-08-15
    # (finding 1 saw them in the output), so no validation of a2 holds a date after it.
    # Validation 2: 2022-06-22 is a Wednesday; plus 10 business days: Jun 23, 24, 27, 28,
    # 29, 30, Jul 1, (4 Independence Day skipped) 5, 6, 7 -> 2022-07-07.
    out = _send(client, j04())
    assert _dated_after(out, "stem.validation_", "a2", "2022-08-15") == []
    assert window(out, "stem.validation_1.a2")[0] == "2021-12-22"
    assert window(out, "stem.validation_2.a2") == ("2022-06-22", "2022-07-07")


# J05


def test_j05_pre_completion_filing_opens_90_days_before_the_first_year(
    client: TestClient,
) -> None:
    # Section 14: first_year_done_on minus opt.pre_completion_file_before_days (90).
    # 2025-05-09 minus 90: 04-09 (30), 03-10 (60), 02-08 (90): the journey's 2025-02-08.
    out = _send(client, j05())
    assert window(out, "opt_pre.apply_window.a1")[0] == "2025-02-08"


def test_j05_post_completion_windows(client: TestClient) -> None:
    # p1 end 2026-05-15: 2026-02-14 to 2026-07-14 (as J01's p2); complete by 2027-07-15.
    # STEM: a3 end 2027-01-14 minus 90: 12-15 (30), 11-15 (60), 10-16 (90).
    out = _send(client, j05())
    assert window(out, "opt.apply_window.a3") == ("2026-02-14", "2026-07-14")
    assert window(out, "opt.complete_by.a3")[1] == "2027-07-15"
    assert window(out, "stem.apply_window.a3")[0] == "2026-10-16"


def test_j05_the_next_stem_stage_carries_no_report_dates(client: TestClient) -> None:
    # resolutions point 16: stem.a3 is next (window from 2026-10-16) and no STEM card exists.
    # The fix 2 run gave validation_1 2026-12-08 to 12-22 (OPT card start 2026-06-08 plus 6
    # months) and a concluding evaluation 2027-01-14 to 01-24 (OPT card end).
    out = _send(client, j05())
    assert _report_dates(out, "a3") == []


def test_j05_months_at_level_is_null_with_a_part_time_pre_completion_card(
    client: TestClient,
) -> None:
    # Section 14 counters: "A part_time opt_pre in the group makes the count null, with a
    # step back (IMPL-017)".
    out = _send(client, j05())
    assert value(out, "opt.months_at_level.master") is None
    assert out["verdict"]["state"] in ("cannot_tell", "talk_to_dso")


# J06


def test_j06_full_time_cpt_is_370_days_and_part_time_is_not_added(client: TestClient) -> None:
    # 89 (05-20..08-16: 12 + 30 + 31 + 16) + 124 (08-19..12-20: 13 + 30 + 31 + 30 + 20)
    # + 131 (01-06..05-16: 26 + 28 + 31 + 30 + 16) + 26 (05-19..06-13: 13 + 13) = 370.
    # a5 is part time: not in the full-time scope.
    out = _send(client, j06())
    assert value(out, "cpt.full_time_days_at_level.master") == 370


def test_j06_days_over_the_bar_and_months_under_it_step_back(client: TestClient) -> None:
    # Section 14: "When the two CPT counts disagree on the bar, the verdict steps back (J06)".
    # Days 370 >= 365 (cpt.full_time_bar_days). Months under 12 (cpt.full_time_months_bar):
    # each span is under 5 months, and 2 + 4 + 4 + 0 whole months plus days stays below 12.
    # The SPEC names no id for the item; this asks for a judgement item on the CPT counts
    # beyond the days' own at_or_over item.
    out = _send(client, j06())
    assert value(out, "cpt.full_time_months_at_level.master") < 12
    extra = [
        r
        for r in reasons(out)
        if r.startswith("cpt.") and r != "cpt.full_time_days_at_level.at_or_over_limit.master"
    ]
    assert extra, reasons(out)


def test_j06_the_masters_opt_is_not_next_after_its_filing_windows_closed(
    client: TestClient,
) -> None:
    # resolutions point 15: "A next stage is shown only while a window in which something
    # can be filed is open; opt.complete_by is not such a window." p1 ends 2025-12-12; the
    # filing window is 2025-09-13 to 2026-02-10 (J06 timeline), closed 231 days before
    # 2026-09-29. opt.complete_by (2025-12-12 plus 14 months, 2027-02-12) is still open but
    # nothing can be filed in it (reviews/product-2-fix1.md finding 3). The same point means
    # the stage, and with it opt.apply_window.p1, is not shown, so the window is not asked
    # for here (engine/REPORT.json, l-engine-90c06e929c, disputes).
    out = _send(client, j06())
    assert all(s["state"] != "next" for s in out["stages"] if s["id"] == "opt_post.p1")


# J07


def test_j07_cpt_at_both_schools_counts_at_the_same_level(client: TestClient) -> None:
    # 2024-05-20..08-09: 12 + 30 + 31 + 9 = 82. 2026-05-18..08-07: 14 + 30 + 31 + 7 = 82.
    # Section 11: same level means the same level value, at any school: 164.
    out = _send(client, j07())
    assert value(out, "cpt.full_time_days_at_level.bachelor") == 164


def test_j07_opt_is_next_for_the_bachelors_at_school_b(client: TestClient) -> None:
    # p2 end 2027-05-14 minus 90: 2027-02-13 (as J04). The journey: 2027-02-13 to 2027-07-13.
    out = _send(client, j07())
    assert stage(out, "opt_post.p2")["state"] == "next"
    assert window(out, "opt.apply_window.p2")[0] == "2027-02-13"
    assert "opt_post.p1" not in stage_ids(out)


# J08


def test_j08_the_bachelors_opt_ends_the_day_before_the_masters_starts(
    client: TestClient,
) -> None:
    # Section 11, change of level: "the day before the new program starts". p2 starts
    # 2025-01-13, so a1 ends 2025-01-12, not the card end 2025-06-02 (finding 2).
    out = _send(client, j08())
    assert stage(out, "opt_post.a1")["ends"] == "2025-01-12"


def test_j08_unemployment_on_the_bachelors_card_is_35_days(client: TestClient) -> None:
    # 2024-06-03 to 2024-07-07 without work: June 3-30 (28), July 1-7 (7) = 35. The work
    # and trip lists are whole and the job covers the rest of the span to 2025-01-12.
    out = _send(client, j08())
    assert value(out, "unemployment.opt_card.a1") == 35


def test_j08_unemployment_is_null_until_the_trip_list_is_whole(client: TestClient) -> None:
    # Resolutions point 13 (point 5 read strictly): the counter reads trips, and a trip
    # changes the count, so with no statement that the trip list is whole there is no count.
    # Stated whole, the same case gives the 35 worked out above.
    assert value(_send(client, j08(trips_whole=False)), "unemployment.opt_card.a1") is None
    assert value(_send(client, j08()), "unemployment.opt_card.a1") == 35


def test_j08_no_stem_extension_of_a_card_the_change_of_level_ended(client: TestClient) -> None:
    # STEM extends an OPT in force (section 14 stem checks); a1 ended 2025-01-12, so its
    # window closed then (point 6).
    out = _send(client, j08())
    assert all(s["state"] != "next" for s in out["stages"] if s["id"] == "stem.a1")


def test_j08_masters_opt_filing_window_is_open_today(client: TestClient) -> None:
    # p2 end 2026-12-18 minus 90: 11-18 (30), 10-19 (60), 09-19 (90): the journey's
    # 2026-09-19, ten days before today.
    out = _send(client, j08())
    assert stage(out, "opt_post.p2")["state"] == "next"
    assert window(out, "opt.apply_window.p2")[0] == "2026-09-19"


# J09


def test_j09_windows_move_with_the_end_date_in_force_on_filed_on(client: TestClient) -> None:
    # End in force on 2025-10-15 is 2025-12-19. Minus 90: 11-19 (30), 10-20 (60), 09-20 (90).
    # Plus 60: 12-31 (12), 01-31 (43), 02-17 (60). Complete by: plus 14 months, 2027-02-19.
    out = _send(client, j09())
    assert window(out, "opt.apply_window.a1") == ("2025-09-20", "2026-02-17")
    assert window(out, "opt.latest_start.a1")[1] == "2026-02-17"
    assert window(out, "opt.complete_by.a1")[1] == "2027-02-19"


def test_j09_an_extension_asked_in_time_raises_no_conflict(client: TestClient) -> None:
    # requested 2025-04-21, on or before old_end 2025-05-16.
    out = _send(client, j09())
    assert "conflict:end_date_change.asked_before_end.ec1" not in reasons(out)


def test_j09_the_late_request_is_asked_about(client: TestClient) -> None:
    # The late variant: requested 2025-05-20, after 2025-05-16 (section 14 check).
    out = _send(client, j09(requested_on="2025-05-20"))
    assert "conflict:end_date_change.asked_before_end.ec1" in reasons(out)


def test_j09_the_next_stem_stage_carries_no_report_dates(client: TestClient) -> None:
    # resolutions point 16: stem.a1 is a next stage and no STEM card exists. The fix 2 run
    # gave validation_1 2026-07-12 to 07-24 (OPT card start 2026-01-12 plus 6 months) and a
    # concluding evaluation 2027-01-11 to 01-21 (OPT card end).
    out = _send(client, j09())
    assert _report_dates(out, "a1") == []


# J10


def test_j10_no_grace_for_a_program_a_move_leaves(client: TestClient) -> None:
    # Section 14 grace: "for each completed program that no move leaves". mv1 leaves p1.
    out = _send(client, j10())
    assert "grace.p1" not in stage_ids(out)
    assert stage(out, "transfer.mv1")["record"] == "mv1"


# J11


def test_j11_unemployment_with_days_abroad_is_86(client: TestClient) -> None:
    # 10-01..10-14 (14) + 02-28..03-09 (1 + 9 = 10) + 03-10..04-20 abroad, personal
    # (22 + 20 = 42) + 04-21..05-10 (10 + 10 = 20) = 86. The approved-leave trip falls in
    # the job and does not count (section 14: only personal or study_abroad days).
    out = _send(client, j11())
    assert value(out, "unemployment.opt_card.a1") == 86


def test_j11_grace_runs_60_days_from_the_card_end(client: TestClient) -> None:
    # Card end 2026-09-30. Plus 60: 10-31 (31), 11-29 (60): the journey's 2026-11-29.
    out = _send(client, j11())
    assert stage(out, "grace.p1")["ends"] == "2026-11-29"


def test_j11_the_next_stem_stage_carries_no_report_dates(client: TestClient) -> None:
    # resolutions point 16: stem.a1 is next while its window runs to the card end 2026-09-30,
    # and no STEM card exists. The fix 2 run gave a concluding evaluation opening 2026-09-30,
    # one day after today, for a student who has never held a STEM card.
    out = _send(client, j11())
    assert _report_dates(out, "a1") == []


# J12, J13 and J14 each hold a change-of-status petition h1, filed 2026-04-01: resolutions
# point 19, "The journeys that hold a petition (J12, J13, J14 ...) expect exactly this step
# back." Point 19 replaces the petition-derived assertions of points 4, 12 and 15 here, which
# are removed: J12 cap_gap.h1 2026-06-01 to 2026-10-01 and current, no grace after
# 2026-10-01, unemployment.opt_card.h1 0; J13 cap_gap.h1 2026-07-01 to 2026-08-14 and the
# item grace.after_cap_gap_outcome; J14 cap_gap.h1 2026-06-01 to 2026-07-25,
# unemployment.total.a1 85, grace.after_cap_gap_outcome, and stem.evaluation_final.a2
# 2026-07-15 to 2026-07-25 (a job's end the cap-gap had carried past the card end).


# J12


def test_j12_the_approved_petition_steps_back_to_the_dso(client: TestClient) -> None:
    # Point 19: h1 is approved with a change of status (validity_start 2026-10-01). No
    # cap_gap stage, no conflict, and the verdict carries cap_gap.for_dso.
    out = _send(client, j12())
    assert _not_the_step_back(out, "h1") == []


def test_j12_the_grace_it_could_follow_is_null(client: TestClient) -> None:
    # Point 19: "the grace of the program and card it could follow" is null. Without h1 it
    # would be grace.p1 after a1's card_end 2026-05-31: June 1 to 30 is 30 days, July 1 to 30
    # is 60 -> 2026-06-01 to 2026-07-30. No grace stage holds a date, grace.h1 neither.
    out = _send(client, j12())
    assert _grace_dated(out) == []


def test_j12_no_cap_gap_unemployment_count(client: TestClient) -> None:
    # Point 19: "the unemployment count from that day" (2026-04-01) is null, and point 12's
    # cap-gap count unemployment.opt_card.h1 counts days after it, so it is null or not given.
    out = _send(client, j12())
    assert _null_or_absent(out, "unemployment.opt_card.h1")


# J13


def test_j13_the_denied_petition_steps_back_to_the_dso(client: TestClient) -> None:
    # Point 19: "any change-of-status petition", a denied one too (denied 2026-08-14). No
    # cap_gap stage, no grace.after_cap_gap_outcome item, and cap_gap.for_dso.
    out = _send(client, j13())
    assert _not_the_step_back(out, "h1") == []


def test_j13_the_grace_it_could_follow_is_null(client: TestClient) -> None:
    # Point 19. Without h1, grace.p1 would follow a1's card_end 2026-06-30: July 1 to 31 is
    # 31 days, August 1 to 29 is 60 -> 2026-07-01 to 2026-08-29. None is given.
    out = _send(client, j13())
    assert _grace_dated(out) == []


# J14


def test_j14_the_withdrawn_petition_steps_back_to_the_dso(client: TestClient) -> None:
    # Point 19: h1 withdrawn 2026-07-25. No cap_gap stage, no conflict, cap_gap.for_dso.
    out = _send(client, j14())
    assert _not_the_step_back(out, "h1") == []


def test_j14_the_opt_card_count_stands_and_the_total_is_null(client: TestClient) -> None:
    # a1 runs 2023-06-01 to 2024-05-31, all before the filing 2026-04-01, so h1 cannot change
    # its count: w1 starts 2023-07-11, so June 1 to 30 (30) and July 1 to 10 (10) = 40. The
    # total chains a2, which runs to 2026-05-31, past the filing: point 19 makes "the
    # unemployment count from that day" null.
    out = _send(client, j14())
    assert value(out, "unemployment.opt_card.a1") == 40
    assert _null_or_absent(out, "unemployment.total.a1")


def test_j14_no_validation_or_evaluation_from_the_filing_onward(client: TestClient) -> None:
    # Point 19: "every validation and evaluation from the petition's filing onward" is null.
    # Filed 2026-04-01. The final evaluations (a2's, and w2's from its end 2026-07-15) and
    # validation_4 (2026-06-01, after the card end anyway) hold no date.
    out = _send(client, j14())
    assert _reports_dated_from(out, "2026-04-01") == []


def test_j14_reports_before_the_filing_stand(client: TestClient) -> None:
    # Resolutions point 16, unchanged by point 19 because each lies before 2026-04-01. a2
    # starts 2024-06-01. Validation 3: 2025-12-01, Monday; plus 10 business days: Dec 2, 3,
    # 4, 5, 8, 9, 10, 11, 12, 15 -> 2025-12-15. The 12-month evaluation: 2024-06-01 plus 12
    # months is 2025-06-01; plus 10 days: Jun 2 (1) ... Jun 11 (10) -> closes 2025-06-11.
    out = _send(client, j14())
    assert window(out, "stem.validation_3.a2") == ("2025-12-01", "2025-12-15")
    assert window(out, "stem.evaluation_12_month.a2")[1] == "2025-06-11"


# J15


def test_j15_unemployment_on_the_opt_card_is_86(client: TestClient) -> None:
    # 06-15..08-19 (16 + 31 + 19 = 66) + 2025-04-01..04-20 (20) = 86.
    out = _send(client, j15())
    assert value(out, "unemployment.opt_card.a1") == 86


def test_j15_first_validation_skips_christmas(client: TestClient) -> None:
    # 2025-06-15 plus 6 months: 2025-12-15, a Monday. Plus 10 business days: 16, 17, 18,
    # 19, 22, 23, 24, (25 Christmas skipped) 26, 29, 30 -> 2025-12-30.
    out = _send(client, j15())
    assert window(out, "stem.validation_1.a2") == ("2025-12-15", "2025-12-30")


def test_j15_validations_run_to_the_card_end_through_the_gap_between_jobs(
    client: TestClient,
) -> None:
    # resolutions point 16, (f)(12)(ii)(B): reporting "ends when the student's F-1 status
    # expires or the 24-month OPT extension concludes, whichever is first"; "A job's end
    # does not end validations." Job B ends 2025-10-31, Job C starts 2025-12-01; the card
    # runs 2025-06-15 to 2027-06-14.
    # Validation 2: 2026-06-15 (Monday) plus 10 business days: 16, 17, 18, (19 Juneteenth
    # skipped) 22, 23, 24, 25, 26, 29, 30 -> 2026-06-30.
    # Validation 3: 2026-12-15 (Tuesday): 16, 17, 18, 21, 22, 23, 24, (25 Christmas
    # skipped) 28, 29, 30 -> 2026-12-30. Validation 4 would be 2027-06-15, the day after
    # the card ends, so it holds no date.
    out = _send(client, j15())
    assert window(out, "stem.validation_2.a2") == ("2026-06-15", "2026-06-30")
    assert window(out, "stem.validation_3.a2") == ("2026-12-15", "2026-12-30")
    assert _dated_after(out, "stem.validation_", "a2", "2027-06-14") == []


def test_j15_validations_go_on_after_the_last_job_ends(client: TestClient) -> None:
    # resolutions point 16 (reviews/product-2-fix2.md finding 2): Job C ends 2026-12-11, a
    # Friday, so every job under the card has an end, while the card runs to 2027-06-14.
    # Validation 3 opens 2026-12-15, after that end, and is still due: 2026-12-15 to
    # 2026-12-30 (worked above). Days without a job by then stay under 150: 86 on the OPT
    # card, 30 in November 2025, 21 at 15 hours a week (2026-01-05 to 01-25, if counted)
    # and 4 (12-12 to 12-15): 141. The fix 2 run dropped validation 3 here.
    out = _send(client, j15(job_c_end="2026-12-11"))
    assert window(out, "stem.validation_3.a2") == ("2026-12-15", "2026-12-30")


def test_j15_job_b_gets_its_final_evaluation_from_its_end(client: TestClient) -> None:
    # resolutions point 16, (f)(10)(ii)(C)(9)(i): a final evaluation is due for each
    # practical training opportunity on the STEM card that ends, "including a job that ends
    # before a later one begins (J15, Job B)". Job B (w3 under a2) ends 2025-10-31. Plus 10
    # days: Nov 1 (1) ... Nov 10 (10), the journey's "Job B final evaluation due
    # 2025-11-10". The contract names no id for it, so any final evaluation window will do;
    # stem_job_end.report.w3 holds the same dates but is the loss of employment report.
    out = _send(client, j15())
    assert ("2025-10-31", "2025-11-10") in _final_evaluations(out)


# J16


def test_j16_no_stem_step_for_a_foreign_degree_and_a_non_stem_mba(client: TestClient) -> None:
    # Section 14 candidate basis: where us_on_f1 or us_other_status (p0 is outside_us) and
    # stem_list on_list (p1 is not_on_list). No candidate, so stem.a2 is not next.
    out = _send(client, j16())
    assert "stem.a2" not in stage_ids(out)
    assert "program.p0" not in stage_ids(out)


def test_j16_windows_and_cpt(client: TestClient) -> None:
    # p1 end 2026-05-15: 2026-02-14 to 2026-07-14. CPT 05-19..08-08: 13 + 30 + 31 + 8 = 82.
    out = _send(client, j16())
    assert window(out, "opt.apply_window.a2") == ("2026-02-14", "2026-07-14")
    assert value(out, "cpt.full_time_days_at_level.master") == 82


def test_j16_no_stem_list_question_for_a_degree_earned_abroad(client: TestClient) -> None:
    # Section 10 and 17: stem_list is asked "when a STEM step or basis turns on it"; an
    # outside_us degree is never a basis (finding 9, point 8).
    out = _send(client, j16())
    assert "p0.stem_list" not in question_ids(out)


# J17


def test_j17_a_term_below_a_full_course_goes_to_the_dso(client: TestClient) -> None:
    # Section 14: full_course_each_term no or not sure gives <program>.enrollment.
    out = _send(client, j17())
    assert "p1.enrollment" in reasons(out)


def test_j17_opt_filing_window_is_open_in_the_final_term(client: TestClient) -> None:
    # p1 end 2026-12-18 minus 90: 2026-09-19 (as J08).
    out = _send(client, j17())
    assert window(out, "opt.apply_window.p1")[0] == "2026-09-19"


# J18


def test_j18_the_program_ends_on_the_extended_date(client: TestClient) -> None:
    # Section 11: the end in force is end_date 2027-12-17. OPT next: minus 90 is 11-17 (30),
    # 10-18 (60), 09-18 (90): 2027-09-18.
    out = _send(client, j18())
    assert stage(out, "program.p1")["ends"] == "2027-12-17"
    assert window(out, "opt.apply_window.p1")[0] == "2027-09-18"


# J19


def test_j19_stem_validations_stop_at_the_card_end(client: TestClient) -> None:
    # Was test_j19_stem_validations_skip_juneteenth. a2 starts 2026-06-09. Plus 6 months:
    # 2026-12-09 (a Wednesday); plus 10 business days: 10, 11, 14, 15, 16, 17, 18, 21, 22,
    # 23 -> 2026-12-23. Plus 24 months would be 2028-06-09, the day after the card ends
    # 2028-06-08: resolutions point 16 (correcting point 15's "or the training ends":
    # validations exist only while a STEM card exists), and 8 CFR 214.2(f)(12)(ii)(B),
    # reporting "ends when ... the 24-month OPT extension concludes", so validation_4 holds
    # no date. The Juneteenth skip moved to
    # a validation inside its card (holdout, test_twin_j19_validation_skips_juneteenth).
    out = _send(client, j19())
    assert window(out, "stem.validation_1.a2") == ("2026-12-09", "2026-12-23")
    assert _dated_after(out, "stem.validation_", "a2", "2028-06-08") == []


def test_j19_the_associates_opt_is_not_next_after_its_window_closed(client: TestClient) -> None:
    # p1 end 2023-05-19 plus 60: 2023-07-18, long past (finding 5, point 6).
    out = _send(client, j19())
    assert all(s["state"] != "next" for s in out["stages"] if s["id"] == "opt_post.p1")


def test_j19_nothing_asked_about_stem_for_english_language_training(client: TestClient) -> None:
    # Section 14: language_training has no OPT and is never a STEM basis (finding 9).
    out = _send(client, j19())
    assert "p0.stem_list" not in question_ids(out)
    assert "p0.conferred_on" not in question_ids(out)
    assert "opt_post.p0" not in stage_ids(out)


# J19 with a change-of-status petition h9: the twins of resolutions points 17 and 18
# (reviews/product-2-fix3.md finding 2, reviews/product-2-fix4.md findings 1, 2 and 4). Point
# 19 replaces what points 17 and 18 said a petition does: "When any change-of-status petition
# is entered", whatever its outcome and however old, the case steps back, and these twins
# "expect exactly this step back". J19's cards: a1 2025-06-09 to 2026-06-08, a2 2026-06-09 to
# 2028-06-08. a2's validations would open 2026-12-09, 2027-06-09 and 2027-12-09 and its
# 12-month evaluation 2027-06-09, all after every filing day used here (the latest is
# 2026-07-01), so no report of a2 holds a date. Without a petition the grace is grace.p2,
# 2028-06-09 to 2028-08-07 (p2 has no move leaving it; a2's card_end 2028-06-08 plus 60: June
# 9 to 30 is 22 days, July 31 more is 53, August 1 to 7 is 60); with one it is null.
# Removed as petition-derived (points 17 and 18): validation_1 2026-12-09 to 2026-12-23,
# validation_2 opening 2027-06-09 and validation_3 2027-12-09 to 2027-12-23 kept beside an old,
# denied, pending or ended petition; grace.p2 2028-06-09 to 2028-08-07 beside an old petition.
# The petitions are filed and decided before today (2026-09-29), so no after-today conflict
# enters the case.
# Point 23a narrows point 19: a petition whose start (validity_start when approved and
# entered, else requested_start) is before the period it would extend takes nothing from it,
# so the 2020 petition steps back for nothing on J19 and the reports and grace above stand.


def _j19_with_petition(outcome: str | None = "approved", **fields: Any) -> dict[str, Any]:
    if outcome is not None:
        fields["outcome"] = outcome
    body = j19()
    body["records"] += [
        rec("e1", "employer", name="Employer One"),
        rec("h9", "petition", type="h1b", employer="e1", change_of_status="yes", **fields),
    ]
    body["complete"].update(whole("petition"))
    return body


def _j19_with_a_2020_petition() -> dict[str, Any]:
    # The fix 3 and fix 4 reviews' input: h9 filed 2020-04-01, approved 2020-06-01,
    # validity_start 2020-10-01, before p0 began 2021-01-11.
    return _j19_with_petition(
        cap_subject="yes",
        filed_on="2020-04-01",
        requested_start="2020-10-01",
        outcome_on="2020-06-01",
        validity_start="2020-10-01",
    )


def test_j19_an_old_approved_petition_from_before_this_f1_status_keeps_the_reports(
    client: TestClient,
) -> None:
    # Point 23a (was point 19's step back): the start used is validity_start 2020-10-01, before
    # a1's start 2025-06-09 and a2's start 2026-06-09, so the petition cannot extend either card
    # and point 19 takes nothing from them. a2's reports are those of plain J19:
    # validation_1 opens 2026-06-09 plus 6 months, 2026-12-09, and closes 14 days later,
    # 2026-12-23 (December 9 plus 14). No cap_gap.for_dso and no cap_gap stage.
    # Kills: a petition stepping back whatever its start; a card's reports nulled by a petition
    # whose start is before the card begins.
    out = _send(client, _j19_with_a_2020_petition())
    plain = _send(client, j19())
    assert STEP_BACK not in reasons(out)
    assert [i for i in stage_ids(out) if i.startswith("cap_gap.")] == []
    assert window(out, "stem.validation_1.a2") == ("2026-12-09", "2026-12-23")
    assert _reports_dated_from(out, "2020-04-01") == _reports_dated_from(plain, "2020-04-01")


def test_j19_an_old_approved_petition_keeps_the_grace_and_opens_no_cap_gap(
    client: TestClient,
) -> None:
    # Point 23a (was point 19's null grace): grace.p2 follows a2 (begins 2026-06-09) and p2
    # (ends 2025-05-16, so the program grace begins 2025-05-17). The start 2020-10-01 is before
    # both, so neither member nulls it: 2028-06-09 to 2028-08-07 (a2's card_end 2028-06-08 plus
    # 60: June 9 to 30 is 22 days, July 31 more is 53, August 1 to 7 is 60). The fix 4 run gave
    # cap_gap.h9 from 2028-06-09 to 2020-10-01 and cap_gap.h9.ends_before_starts: still no
    # cap_gap stage, no conflict naming h9, no cap_gap question.
    # Kills: the program-end member of the grace stepping back for a 2020 start; a cap_gap
    # stage or conflict opened by a petition that cannot extend the card.
    out = _send(client, _j19_with_a_2020_petition())
    assert _grace_dated(out) == [("grace.p2", "2028-06-09", "2028-08-07")]
    assert [i for i in stage_ids(out) if i.startswith("cap_gap.")] == []
    assert [r for r in reasons(out) if "cap_gap" in r or "h9" in re.split("[:.]", r)] == []
    assert [q for q in question_ids(out) if q.startswith("cap_gap.")] == []


def test_j19_a_change_of_status_ended_before_the_h1b_start_steps_back(
    client: TestClient,
) -> None:
    # h9 filed 2026-07-01 while a2 runs, approved 2026-09-15, validity_start 2027-03-01,
    # cos_ended_on 2026-09-22. Point 17 kept validation_2 and validation_3; point 19 nulls
    # every report from 2026-07-01 and the grace.
    out = _send(
        client,
        _j19_with_petition(
            cap_subject="no",
            filed_on="2026-07-01",
            requested_start="2027-03-01",
            outcome_on="2026-09-15",
            validity_start="2027-03-01",
            cos_ended_on="2026-09-22",
        ),
    )
    assert _not_the_step_back(out, "h9") == []
    assert _reports_dated_from(out, "2026-07-01") == []
    assert _grace_dated(out) == []


def test_j19_a_petition_filed_while_the_card_runs_and_approved_steps_back(
    client: TestClient,
) -> None:
    # The same h9 with no cos_ended_on. Points 17 and 18 kept validation_1 (2026-12-09 to
    # 2026-12-23) before the H-1B start; it lies after the filing 2026-07-01, so point 19
    # nulls it with the rest.
    out = _send(
        client,
        _j19_with_petition(
            cap_subject="no",
            filed_on="2026-07-01",
            requested_start="2027-03-01",
            outcome_on="2026-09-15",
            validity_start="2027-03-01",
        ),
    )
    assert _not_the_step_back(out, "h9") == []
    assert _reports_dated_from(out, "2026-07-01") == []
    assert _grace_dated(out) == []


def test_j19_a_petition_filed_the_day_before_the_card_began_steps_back(
    client: TestClient,
) -> None:
    # Point 17's edge: filed 2026-06-08, a1's last day. Point 19 asks no such edge: every
    # report from 2026-06-08 onward is null.
    out = _send(
        client,
        _j19_with_petition(
            cap_subject="no",
            filed_on="2026-06-08",
            requested_start="2027-03-01",
            outcome_on="2026-09-15",
            validity_start="2027-03-01",
        ),
    )
    assert _not_the_step_back(out, "h9") == []
    assert _reports_dated_from(out, "2026-06-08") == []
    assert _grace_dated(out) == []


def test_j19_a_petition_filed_on_the_cards_first_day_steps_back(client: TestClient) -> None:
    # Point 17's edge, the other side: filed 2026-06-09, a2's first day.
    out = _send(
        client,
        _j19_with_petition(
            cap_subject="no",
            filed_on="2026-06-09",
            requested_start="2027-03-01",
            outcome_on="2026-09-15",
            validity_start="2027-03-01",
        ),
    )
    assert _not_the_step_back(out, "h9") == []
    assert _reports_dated_from(out, "2026-06-09") == []
    assert _grace_dated(out) == []


def test_j19_a_petition_filed_during_opt_for_a_later_start_steps_back(
    client: TestClient,
) -> None:
    # Point 18's usual cap-gap (fix 4 finding 2): cap subject, filed 2026-04-01 while a1 ran,
    # approved 2026-06-20, validity_start 2026-10-01. Point 19: the step back.
    out = _send(
        client,
        _j19_with_petition(
            cap_subject="yes",
            filed_on="2026-04-01",
            requested_start="2026-10-01",
            outcome_on="2026-06-20",
            validity_start="2026-10-01",
        ),
    )
    assert _not_the_step_back(out, "h9") == []
    assert _reports_dated_from(out, "2026-04-01") == []
    assert _grace_dated(out) == []


def test_j19_a_petition_starting_on_the_cards_first_day_steps_back(client: TestClient) -> None:
    # Point 18's edge: validity_start 2026-06-09, a2's first day; filed 2026-03-02 during a1,
    # approved 2026-05-01. Point 19: the step back.
    out = _send(
        client,
        _j19_with_petition(
            cap_subject="yes",
            filed_on="2026-03-02",
            requested_start="2026-06-09",
            outcome_on="2026-05-01",
            validity_start="2026-06-09",
        ),
    )
    assert _not_the_step_back(out, "h9") == []
    assert _reports_dated_from(out, "2026-03-02") == []
    assert _grace_dated(out) == []


def test_j19_a_denied_petition_on_the_card_steps_back(client: TestClient) -> None:
    # Point 18's denied twin (fix 4 finding 4a): filed 2026-07-01, denied 2026-09-15. Point 18
    # kept validation_2 and validation_3; point 19 steps back for any petition entered.
    out = _send(
        client,
        _j19_with_petition(
            outcome="denied",
            cap_subject="no",
            filed_on="2026-07-01",
            requested_start="2027-03-01",
            outcome_on="2026-09-15",
            validity_start="2027-03-01",
        ),
    )
    assert _not_the_step_back(out, "h9") == []
    assert _reports_dated_from(out, "2026-07-01") == []
    assert _grace_dated(out) == []


def test_j19_a_pending_petition_on_the_card_steps_back_and_asks_no_start(
    client: TestClient,
) -> None:
    # Point 18's pending twin: filed 2026-07-01, pending, requested_start 2027-03-01. Point 19
    # steps back. programs.md section 10 gives validity_start only when approved, so a
    # pending petition is not asked for one.
    out = _send(
        client,
        _j19_with_petition(
            outcome="pending",
            cap_subject="no",
            filed_on="2026-07-01",
            requested_start="2027-03-01",
        ),
    )
    assert _not_the_step_back(out, "h9") == []
    assert _reports_dated_from(out, "2026-07-01") == []
    assert "h9.validity_start" not in question_ids(out)


def _j19_approved_with_no_validity_start() -> dict[str, Any]:
    # h9 approved 2026-09-15, filed 2026-07-01, validity_start left out.
    return _j19_with_petition(
        cap_subject="no",
        filed_on="2026-07-01",
        requested_start="2027-03-01",
        outcome_on="2026-09-15",
    )


def test_j19_an_approved_petition_with_no_validity_start_steps_back(
    client: TestClient,
) -> None:
    # Point 19 steps back for any petition whatever its outcome; point 21 keeps these step-back
    # assertions as a passing test. Not knowing the validity start leaves cannot_tell.
    out = _send(client, _j19_approved_with_no_validity_start())
    assert out["verdict"]["state"] == "cannot_tell"
    assert _not_the_step_back(out, "h9") == []


@pytest.mark.xfail(strict=True, reason="point 21: asked again in the cap-gap round")
def test_j19_an_approved_petition_with_no_validity_start_is_asked_for_it(
    client: TestClient,
) -> None:
    # Point 18 (fix 4 finding 4b): "When the facts that decide it (the outcome, the validity
    # start) are missing, Duly asks for them" (PRINCIPLES 2). Point 21: while cap-gap is
    # deferred the validity start decides nothing and is not asked, so this assertion waits
    # for the cap-gap round (strict: it fails the run the day the engine asks again early).
    out = _send(client, _j19_approved_with_no_validity_start())
    assert "h9.validity_start" in question_ids(out)


def _j19_with_no_outcome() -> dict[str, Any]:
    # h9 filed 2026-07-01, outcome left out.
    return _j19_with_petition(
        outcome=None,
        cap_subject="no",
        filed_on="2026-07-01",
        requested_start="2027-03-01",
        validity_start="2027-03-01",
    )


def test_j19_a_petition_with_no_outcome_steps_back(client: TestClient) -> None:
    # Point 19 steps back for any petition whatever its outcome; point 21 keeps these step-back
    # assertions as a passing test.
    out = _send(client, _j19_with_no_outcome())
    assert out["verdict"]["state"] == "cannot_tell"
    assert _not_the_step_back(out, "h9") == []


@pytest.mark.xfail(strict=True, reason="point 21: asked again in the cap-gap round")
def test_j19_a_petition_with_no_outcome_is_asked_for_it(client: TestClient) -> None:
    # Point 18: the outcome is the other fact that decides it, and Duly asks for it. Point 21:
    # while cap-gap is deferred the outcome decides nothing and is not asked, so this
    # assertion waits for the cap-gap round.
    out = _send(client, _j19_with_no_outcome())
    assert "h9.outcome" in question_ids(out)


# J20


def test_j20_opt_on_the_mba_and_no_second_masters_opt(client: TestClient) -> None:
    # p1 end 2026-05-15: 2026-02-14 to 2026-07-14. The master's 12 months are used by a1
    # (2026-06-15 to 2027-06-14), so opt_post for p2 is not next (section 14, only_if months
    # at this level below opt.max_months).
    out = _send(client, j20())
    assert window(out, "opt.apply_window.a1") == ("2026-02-14", "2026-07-14")
    assert value(out, "opt.months_at_level.master") == 12
    assert "opt_post.p2" not in stage_ids(out)


def test_j20_the_next_stem_stage_carries_no_report_dates(client: TestClient) -> None:
    # resolutions point 16: stem.a1 (OPT on the MBA, card 2026-06-15 to 2027-06-14) is a next
    # stage and no STEM card exists. The fix 2 run gave validation_1 2026-12-15 to 12-30 and
    # a concluding evaluation 2027-06-14 to 06-24.
    out = _send(client, j20())
    assert _report_dates(out, "a1") == []
