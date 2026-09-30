"""POST /v1/compute: a case for any category in, the engine output out.

Specified in specs/design-1/SPEC.md section 11, RQ-A1: "POST /v1/compute: case.schema.json
in, engine output out. Stateless. It gives the same refusals as /v1/compute/f1
(NOT_A_NUMBER, NOT_JSON, NOT_YET, first_problem). A category whose pack has no path gives
cannot_tell with category_not_covered:<id> (path-1)." Also specs/path-1/contracts-reconciled.md
point 10 (it takes the new case.schema.json) and point 12 (scope.documents_count is filled
by the engine, since the new case has no field for it).

Expected to fail until the build round: the route does not exist yet.
"""

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, FormatChecker

from api import case_f1 as refusals
from api.main import app, get_clock
from engine.clocks import FixedClock

URL = "/v1/compute"
REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_SCHEMA = json.loads((REPO_ROOT / "contracts" / "engine_output.schema.json").read_text())
CASE_SCHEMA = json.loads((REPO_ROOT / "contracts" / "case.schema.json").read_text())
# Today is 2026-09-29 in UTC; noon keeps the day the same in every zone the tests use.
CLOCK = FixedClock(datetime(2026, 9, 29, 12, 0, tzinfo=UTC))


def _case(**changes: Any) -> dict[str, Any]:
    """The smallest case case.schema.json accepts: h1b, whose shipped pack has no path."""
    case: dict[str, Any] = {
        "categories": ["h1b"],
        "time_zone": "UTC",
        "facts": {},
        "records": [],
        "complete": {},
    }
    case.update(changes)
    return case


@pytest.fixture
def client() -> Any:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def _schema_problems(instance: Any, schema: dict[str, Any]) -> list[str]:
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return [e.message for e in validator.iter_errors(instance)]


def test_the_test_case_is_valid_under_case_schema() -> None:
    # Guards the fixtures themselves: every refusal below comes from one change to a case
    # the contract accepts. Fails if case.schema.json changes its required fields.
    assert _schema_problems(_case(), CASE_SCHEMA) == []


def test_a_category_whose_pack_has_no_path_is_cannot_tell_with_category_not_covered(
    client: TestClient,
) -> None:
    # RQ-A1 and specs/path-1/SPEC.md point 6: rulepacks/h1b-us/v2026.09 holds no path.
    res = client.post(URL, json=_case())
    assert res.status_code == 200
    out = res.json()
    assert out["verdict"]["state"] == "cannot_tell"
    assert "category_not_covered:h1b" in out["verdict"]["reasons"]


def test_the_answer_matches_the_engine_output_contract(client: TestClient) -> None:
    # RQ-A1: "engine output out".
    out = client.post(URL, json=_case()).json()
    assert _schema_problems(out, OUTPUT_SCHEMA) == []


def test_today_is_the_injected_clock_in_the_person_zone(client: TestClient) -> None:
    # CLAUDE.md: time only through engine.clocks. 2026-09-29 12:00 UTC is 2026-09-29 in
    # America/New_York (08:00) and 2026-09-30 in Pacific/Kiritimati (UTC+14, 02:00 next day).
    ny = client.post(URL, json=_case(time_zone="America/New_York")).json()
    assert ny["today"] == {"date": "2026-09-29", "time_zone": "America/New_York"}
    ki = client.post(URL, json=_case(time_zone="Pacific/Kiritimati")).json()
    assert ki["today"]["date"] == "2026-09-30"


def test_scope_documents_count_is_filled_by_the_engine(client: TestClient) -> None:
    # contracts-reconciled point 12: the new case has no field for it, so the engine fills
    # scope.documents_count from what it holds. The case holds no document: 0.
    out = client.post(URL, json=_case()).json()
    assert out["scope"]["documents_count"] == 0


def test_documents_count_in_the_body_is_refused(client: TestClient) -> None:
    # contracts-reconciled point 12 and case.schema.json (additionalProperties false).
    res = client.post(URL, json=_case(documents_count=2))
    assert res.status_code == 422


def test_not_json_is_refused_with_the_same_words_as_compute_f1(client: TestClient) -> None:
    res = client.post(URL, content=b"{not json", headers={"content-type": "application/json"})
    assert res.status_code == 422
    assert res.json()["detail"] == refusals.NOT_JSON


def test_nan_is_refused_with_the_same_words_as_compute_f1(client: TestClient) -> None:
    # case.schema.json: "NaN and Infinity are refused before validation".
    body = json.dumps(_case()).replace('"facts": {}', '"facts": {"x": NaN}')
    res = client.post(URL, content=body, headers={"content-type": "application/json"})
    assert res.status_code == 422
    assert res.json()["detail"] == refusals.NOT_A_NUMBER


@pytest.mark.parametrize(
    "change",
    [
        {"categories": []},
        {"time_zone": "Not a zone!"},
        {"records": [{"id": "P1", "kind": "program", "fields": {}}]},
        {"complete": {"program": {"on": "2026-13-01"}}},
    ],
    ids=["no_category", "bad_zone", "bad_record_id", "bad_date"],
)
def test_a_case_outside_the_contract_is_refused_with_a_plain_first_problem(
    client: TestClient, change: dict[str, Any]
) -> None:
    # RQ-A1: the same refusals as /v1/compute/f1, the first problem in plain words. Each
    # change breaks one rule of case.schema.json (minItems, the zone pattern, the record id
    # pattern ^[a-z]{1,3}[0-9]{1,4}$, the date pattern).
    body = _case(**change)
    assert _schema_problems(body, CASE_SCHEMA) != []
    res = client.post(URL, json=body)
    assert res.status_code == 422
    detail = res.json()["detail"]
    assert isinstance(detail, str)
    assert detail.strip()


def test_a_missing_required_key_is_refused(client: TestClient) -> None:
    body = _case()
    del body["complete"]
    res = client.post(URL, json=body)
    assert res.status_code == 422


def test_an_answer_dated_after_today_is_refused_with_not_yet(client: TestClient) -> None:
    # RQ-A1 names NOT_YET; product-1 resolution 2: an answer is dated on or before the
    # person's day. Today is 2026-09-29 in UTC, so 2026-09-30 is after it.
    body = _case(confirmations={"record.ends_before_today": {"answer": True, "on": "2026-09-30"}})
    res = client.post(URL, json=body)
    assert res.status_code == 422
    assert res.json()["detail"] == refusals.NOT_YET


def test_the_f1_route_stays(client: TestClient) -> None:
    # specs/path-1/SPEC.md: "case_f1.schema.json and POST /v1/compute/f1 stay as they are".
    # A records case is not an F-1 case, so /v1/compute/f1 refuses it.
    res = client.post("/v1/compute/f1", json=_case())
    assert res.status_code == 422


def test_nothing_from_the_body_is_echoed_in_a_refusal(client: TestClient) -> None:
    # RQ-A1 and contracts-reconciled point 11: a refusal names only where the case fails,
    # never a value from it.
    secret = "Zyxwvut School of Quiet Names"
    body = _case(
        records=[{"id": "p1", "kind": "program", "fields": {"school_name": secret}}],
        time_zone="Nowhere/Zone!",
    )
    res = client.post(URL, json=body)
    assert res.status_code == 422
    assert secret not in res.text
