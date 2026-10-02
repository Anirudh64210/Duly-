"""The contracts hold together after W2-P0 (specs/step-w/SPEC-W2.md, point 48).

Point 48: "every contracts/*.schema.json passes Draft 2020-12's check_schema;
product_settings.yaml rows each carry a unit and say they are settings; today's engine
output for the journeys still validates". The journeys are the twenty of
tests/unit/acceptance/test_journeys.py, each sent through POST /v1/compute at the
acceptance suite's fixed clock.
"""

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
import yaml
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, FormatChecker

from api.main import app, get_clock
from engine.rulepack import REPO_ROOT
from tests.support.api_client import CheckedClient
from tests.support.records_case import CLOCK
from tests.unit.acceptance.test_journeys import JOURNEYS

CONTRACTS = REPO_ROOT / "contracts"
SCHEMAS = sorted(CONTRACTS.glob("*.schema.json"))
SETTINGS = yaml.safe_load((CONTRACTS / "product_settings.yaml").read_text())
SETTING_ROWS: list[dict[str, Any]] = SETTINGS["settings"]
OUTPUT_SCHEMA = json.loads((CONTRACTS / "engine_output.schema.json").read_text())

# Each row's meaning ends by saying what it is: "A product setting, not a rule."
SAYS_SETTING = "A product setting, not a rule."


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield CheckedClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def test_there_are_schemas_to_check() -> None:
    assert SCHEMAS, "no contracts/*.schema.json found"


@pytest.mark.parametrize("path", SCHEMAS, ids=lambda p: p.name)
def test_every_schema_passes_draft_2020_12(path: Path) -> None:
    schema = json.loads(path.read_text())
    assert schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema"
    Draft202012Validator.check_schema(schema)


def test_settings_file_has_rows() -> None:
    assert SETTING_ROWS, "contracts/product_settings.yaml lists no settings"


def test_setting_ids_are_unique() -> None:
    ids = [row["id"] for row in SETTING_ROWS]
    assert len(ids) == len(set(ids))


@pytest.mark.parametrize("row", SETTING_ROWS, ids=lambda r: str(r.get("id")))
def test_every_setting_row_carries_a_unit(row: dict[str, Any]) -> None:
    unit = row.get("unit")
    assert isinstance(unit, str), f"{row.get('id')} has no unit"
    assert unit.strip(), f"{row.get('id')} has an empty unit"


@pytest.mark.parametrize("row", SETTING_ROWS, ids=lambda r: str(r.get("id")))
def test_every_setting_row_says_it_is_a_setting(row: dict[str, Any]) -> None:
    meaning = " ".join(str(row.get("meaning", "")).split())
    assert SAYS_SETTING in meaning, f"{row.get('id')} does not say it is a product setting"
    assert str(row.get("decided_in", "")).strip(), f"{row.get('id')} names no decision"


@pytest.mark.parametrize("jid", sorted(JOURNEYS))
def test_todays_engine_output_for_each_journey_still_validates(
    client: TestClient, jid: str
) -> None:
    res = client.post("/v1/compute", json=JOURNEYS[jid]())
    assert res.status_code == 200, res.text
    validator = Draft202012Validator(OUTPUT_SCHEMA, format_checker=FormatChecker())
    errors = [f"{list(e.absolute_path)}: {e.message}" for e in validator.iter_errors(res.json())]
    assert errors == []
