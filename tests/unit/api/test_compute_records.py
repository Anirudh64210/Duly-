"""POST /v1/compute hands a records case from Onboarding's shape to engine/path.py.

Specified in specs/product-2/resolutions.md point 1: "POST /v1/compute calls engine/path.py
on the records case and returns its output (finding 1) ... The web app builds the records
case from Onboarding and posts it to /v1/compute". The case below is what the steps of
specs/path-1/programs.md section 18 collect for a student with one program and one OPT
card: Step 1 (the current I-20, with "I'm not sure" for the STEM list), Step 3 (the OPT
card), Step 4 (a job and a trip, each list stated whole), and Step 5 (the whole record and
the time zone). It is built here, not by the web app, so the test holds without web/.

The test does not restate engine answers: it asks that the api's output is the path
engine's output for the same case and the same clock.
"""

import json
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, FormatChecker

from api.main import app, get_clock
from engine import path
from engine.rulepack import REPO_ROOT, load_all
from tests.support.api_client import CheckedClient
from tests.support.records_case import CLOCK, case, rec, whole

URL = "/v1/compute"
CASE_SCHEMA = json.loads((REPO_ROOT / "contracts" / "case.schema.json").read_text())
OUTPUT_SCHEMA = json.loads((REPO_ROOT / "contracts" / "engine_output.schema.json").read_text())


def _onboarding_case() -> dict[str, Any]:
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School A",
                level="master",
                field_name="Computer Science",
                cip_code="11.0701",
                stem_list="not_sure",
                start_date="2024-08-26",
                end_date="2026-05-15",
                state="completed",
                coursework_done_on="2026-05-15",
                full_course_each_term="yes",
                online_within_limit="yes",
            ),
            rec(
                "a1",
                "authorization",
                type="opt_post_completion",
                program="p1",
                dso_on="2026-02-20",
                filed_on="2026-03-02",
                decision="approved",
                card_start="2026-06-15",
                card_end="2027-06-14",
            ),
            rec("e1", "employer", name="Employer One"),
            rec(
                "w1",
                "work",
                confirmed_on="2026-09-29",
                employer="e1",
                under="a1",
                start="2026-08-01",
                hours_per_week=40,
            ),
            rec(
                "t1",
                "trip",
                left_on="2026-07-01",
                returned_on="2026-07-10",
                purpose="personal",
                reentry_i20="p1",
                signature_on="2026-06-01",
                job_on_return="no",
            ),
        ],
        whole("program", "authorization:p1", "move", "work", "trip", "petition"),
    )


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield CheckedClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def test_the_onboarding_case_is_valid_under_case_schema() -> None:
    # Guards the fixture: fails if the case leaves case.schema.json.
    problems = list(
        Draft202012Validator(CASE_SCHEMA, format_checker=FormatChecker()).iter_errors(
            _onboarding_case()
        )
    )
    assert problems == []


def test_an_onboarding_case_reaches_path_py_through_the_api(client: TestClient) -> None:
    # Point 1. Fails while api/case.py answers every category as not covered.
    res = client.post(URL, json=_onboarding_case())
    assert res.status_code == 200, res.text
    out = res.json()
    assert "category_not_covered:f1" not in out["verdict"]["reasons"]
    assert [s["id"] for s in out["stages"] if s.get("record") == "p1"][:1] == ["program.p1"]


def test_the_api_returns_the_path_engines_output(client: TestClient) -> None:
    # Point 1: "returns its output". Same case, same clock, same packs.
    body = _onboarding_case()
    res = client.post(URL, json=body)
    assert res.status_code == 200, res.text
    assert res.json() == path.compute(body, load_all(), CLOCK)


def test_the_api_output_meets_the_output_contract(client: TestClient) -> None:
    # contracts/engine_output.schema.json, with record on each item (programs.md Part 2).
    res = client.post(URL, json=_onboarding_case())
    validator = Draft202012Validator(OUTPUT_SCHEMA, format_checker=FormatChecker())
    assert [e.message for e in validator.iter_errors(res.json())] == []
