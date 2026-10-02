"""api/main.py, GET /v1/status: the landing status names when the rules were checked.

specs/product-1/SPEC-resolutions.md, point 35: "The landing status uses the packs' own
rules_checked_on, so it never says the rules have not been checked when they have." The
field is read here as rules_checked_on on each entry of rulepacks; the status contract
(contracts/openapi.yaml, Status) needs it first, and that change is the founder's.

Each pack's date is worked from its file apart from the engine: the oldest checked_on of
its rules, as engine/rulepack.py and SPEC section 7 define rules_checked_on. A pack with no
rules has no date.
"""

from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pytest
import yaml
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from api.main import app, get_clock
from api.settings import Settings, get_settings
from engine.clocks import FixedClock
from tests.support.api_client import CheckedClient

REPO_ROOT = Path(__file__).resolve().parents[3]
UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"


def checked_on_by_category() -> dict[str, str | None]:
    """The oldest checked_on of each shipped pack, read from the files."""
    found: dict[str, str | None] = {}
    for path in sorted((REPO_ROOT / "rulepacks").glob("*/v*/parameters.yaml")):
        raw: dict[str, Any] = yaml.safe_load(path.read_text())
        days = [str(p["source"]["checked_on"]) for p in raw.get("parameters") or []]
        found[raw["category"]] = min(days, default=None)
    return found


def status_on(day: date) -> dict[str, Any]:
    app.dependency_overrides[get_clock] = lambda: FixedClock(
        datetime(day.year, day.month, day.day, 12, 0, tzinfo=UTC)
    )
    app.dependency_overrides[get_settings] = lambda: Settings(
        database_url=UNREACHABLE, ops_ip_allowlist="203.0.113.0/24"
    )
    try:
        response = CheckedClient(app, client=("203.0.113.7", 50000)).get("/v1/status")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    body: dict[str, Any] = response.json()
    return body


@pytest.fixture
def body() -> dict[str, Any]:
    return status_on(date(2026, 9, 29))


def test_the_f1_pack_holds_checked_dates() -> None:
    # The working the tests below stand on: the shipped F-1 pack was checked, on
    # 2026-10-02, the oldest date among its rules (FEED-PA moved every rule the fetch of
    # 2026-10-02 backs; SPEC-FEED point 55).
    assert checked_on_by_category()["f1"] == "2026-10-02"


def test_the_status_names_each_packs_rules_checked_on(body: dict[str, Any]) -> None:
    expected = checked_on_by_category()
    named = {entry["category"]: entry["rules_checked_on"] for entry in body["rulepacks"]}
    assert named == expected


def test_the_status_never_says_rules_never_checked_when_a_pack_holds_checked_dates(
    body: dict[str, Any],
) -> None:
    assert any(day is not None for day in checked_on_by_category().values())
    assert "rules_never_checked" not in body["verdict"]["reasons"]
    # The empty case still has no documents, so the verdict is still cannot_tell.
    assert body["verdict"]["state"] == "cannot_tell"
    assert "no_documents" in body["verdict"]["reasons"]


@settings(
    deadline=None,
    max_examples=15,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
@given(st.dates(min_value=date(2026, 9, 28), max_value=date(2030, 12, 31)))
def test_on_any_day_after_the_check_the_status_is_not_rules_never_checked(day: date) -> None:
    # The clock is injected. However old the check becomes, the rules were checked.
    body = status_on(day)
    assert "rules_never_checked" not in body["verdict"]["reasons"]
