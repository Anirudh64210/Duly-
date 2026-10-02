"""The readable dates are the case schema's own date bounds (SPEC-W2-UNKNOWN, point 53).

specs/step-w/SPEC-W2-UNKNOWN.md, point 53 (W2-U0): "contracts/product_settings.yaml:
dates.earliest_readable 1950-01-01 and dates.latest_readable 2099-12-31, with a contract
test that they match the case schema's date pattern". Point 41: a date is known when it
matches the pattern, is a real calendar day, and lies from dates.earliest_readable to
dates.latest_readable, "the case schema's own date bounds".

So each setting is held as a string, each is taken by every date of the case schemas, and
the day before the first and the day after the last are refused by the same pattern: the
settings and the schema name the same span.
"""

import json
import re
from datetime import date, timedelta
from typing import Any

import pytest
import yaml
from jsonschema import Draft202012Validator, FormatChecker

from engine.rulepack import REPO_ROOT

CONTRACTS = REPO_ROOT / "contracts"
SETTINGS = yaml.safe_load((CONTRACTS / "product_settings.yaml").read_text())
CASE_SCHEMAS = ("case.schema.json", "case_f1.schema.json")

EARLIEST = "dates.earliest_readable"
LATEST = "dates.latest_readable"
# Point 53: the values, claims checked here against the schema rather than copied into it.
EXPECTED = {EARLIEST: "1950-01-01", LATEST: "2099-12-31"}


def _row(setting_id: str) -> dict[str, Any]:
    found = [row for row in SETTINGS["settings"] if row.get("id") == setting_id]
    assert len(found) == 1, f"{setting_id} is listed {len(found)} times, not once"
    row: dict[str, Any] = found[0]
    return row


def _date_schemas(node: Any) -> list[dict[str, Any]]:
    """Every subschema that describes a date string: format date with a pattern."""
    found: list[dict[str, Any]] = []
    if isinstance(node, dict):
        if node.get("format") == "date" and "pattern" in node:
            found.append(node)
        for value in node.values():
            found.extend(_date_schemas(value))
    elif isinstance(node, list):
        for value in node:
            found.extend(_date_schemas(value))
    return found


def _dates_of(name: str) -> list[dict[str, Any]]:
    schemas = _date_schemas(json.loads((CONTRACTS / name).read_text()))
    assert schemas, f"{name} holds no date with a pattern"
    return schemas


def _takes(schema: dict[str, Any], value: str) -> bool:
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return validator.is_valid(value)


@pytest.mark.parametrize("setting_id", list(EXPECTED))
def test_each_readable_date_is_a_setting_with_the_value_of_point_53(setting_id: str) -> None:
    # Fails if: a row is missing or doubled, or YAML read it as a date object (unquoted),
    # which no case schema date and no reader compares with.
    row = _row(setting_id)
    assert row["value"] == EXPECTED[setting_id]
    assert isinstance(row["value"], str)
    assert row["unit"] == "date"


def test_the_earliest_readable_date_is_not_after_the_latest() -> None:
    earliest = date.fromisoformat(_row(EARLIEST)["value"])
    latest = date.fromisoformat(_row(LATEST)["value"])
    assert earliest <= latest


@pytest.mark.parametrize("name", CASE_SCHEMAS)
@pytest.mark.parametrize("setting_id", list(EXPECTED))
def test_each_readable_date_matches_every_date_pattern_of_the_case_schemas(
    name: str, setting_id: str
) -> None:
    # Point 53: the settings match the case schema's date pattern, and are real calendar days.
    value = _row(setting_id)["value"]
    for schema in _dates_of(name):
        assert re.search(schema["pattern"], value), f"{name}: {schema['pattern']} refuses {value}"
        assert _takes(schema, value), f"{name} refuses {value}"


@pytest.mark.parametrize("name", CASE_SCHEMAS)
def test_the_readable_dates_are_the_bounds_the_case_schemas_take(name: str) -> None:
    # Point 41: "the case schema's own date bounds". The day before the earliest and the day
    # after the latest are both real days, and the schema's pattern refuses each, so the
    # settings and the schema name the same span.
    before = (date.fromisoformat(_row(EARLIEST)["value"]) - timedelta(days=1)).isoformat()
    after = (date.fromisoformat(_row(LATEST)["value"]) + timedelta(days=1)).isoformat()
    for schema in _dates_of(name):
        assert not _takes(schema, before), f"{name} takes {before}, before {EARLIEST}"
        assert not _takes(schema, after), f"{name} takes {after}, after {LATEST}"
