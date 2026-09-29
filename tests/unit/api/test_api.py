from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock, get_settings
from api.ops_guard import caller_allowed
from api.settings import Settings
from engine.clocks import FixedClock

UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"


@pytest.fixture
def client():
    app.dependency_overrides[get_clock] = lambda: FixedClock(
        datetime(2026, 9, 28, 12, 0, tzinfo=UTC)
    )
    app.dependency_overrides[get_settings] = lambda: Settings(
        database_url=UNREACHABLE, ops_ip_allowlist="203.0.113.0/24"
    )
    yield TestClient(app, client=("203.0.113.7", 50000))
    app.dependency_overrides.clear()


def test_health(client):
    assert client.get("/health").json() == {"ok": True}


def test_version(client):
    assert set(client.get("/version").json()) == {"api", "contracts"}


def test_status_for_an_empty_case_cannot_tell(client):
    body = client.get("/v1/status").json()
    assert body["verdict"]["state"] == "cannot_tell"
    assert body["database"] == "unreachable"
    assert {p["category"] for p in body["rulepacks"]} == {"f1", "h1b", "o1", "eb1a"}
    assert body["checked_at"].startswith("2026-09-28T12:00:00")


def test_ops_serves_an_allowed_address(client):
    response = client.get("/ops/v1/status")
    assert response.status_code == 200
    assert response.json()["caller"] == "203.0.113.7"


def test_ops_refuses_any_other_address():
    app.dependency_overrides[get_settings] = lambda: Settings(
        database_url=UNREACHABLE, ops_ip_allowlist="203.0.113.0/24"
    )
    try:
        outsider = TestClient(app, client=("198.51.100.9", 50000))
        assert outsider.get("/ops/v1/status").status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_api_docs_are_not_served(client):
    assert client.get("/docs").status_code == 404


@pytest.mark.parametrize(
    ("caller", "allowed"),
    [
        ("203.0.113.7", True),
        ("203.0.114.7", False),
        ("", False),
        ("not-an-address", False),
        ("::1", False),
    ],
)
def test_caller_allowed(caller, allowed):
    assert caller_allowed(caller, ["203.0.113.0/24"]) is allowed


def test_bad_allowlist_stops_boot():
    with pytest.raises(ValueError, match="ops_ip_allowlist"):
        Settings(ops_ip_allowlist="everyone")


def test_unknown_environment_stops_boot():
    with pytest.raises(ValueError, match="env"):
        Settings(env="laptop")
