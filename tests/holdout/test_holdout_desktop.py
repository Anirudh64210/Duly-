"""Hidden second set for the slim desktop engine entrypoint, api/desktop_main.py.

Specified in specs/step-w/SPEC-W1.md section 1, points 1, 2 and 9. The same rules as
tests/unit/desktop_entry/test_desktop_main.py, with other cases, another instant and other
tokens. In process only: the socket itself is checked by the unit set.
"""

from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

import api.main
from api import desktop_main, local_routes
from engine.clocks import FixedClock
from tests.holdout import test_holdout_journeys as twins

TOKEN = "5f" * 32  # 32 bytes in hex, as main makes them (point 9)
HEADER = "X-Duly-Local"
# Another instant than the unit set's 2026-09-29: 2027-01-01 03:30 UTC is 2026-12-31 22:30
# in America/New_York (UTC-5 in winter), the zone of the twins, so the day differs by zone
# and a desktop app that read today another way than the server app would show.
CLOCK = FixedClock(datetime(2027, 1, 1, 3, 30, tzinfo=UTC))


@pytest.fixture
def apps(monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[TestClient, TestClient]]:
    """api.main's app without a launch token, and the desktop app, at the same clock."""
    monkeypatch.delenv("DULY_LOCAL_TOKEN", raising=False)
    desktop = desktop_main.create_app(TOKEN)
    # The shared compute route reads today through local_routes.get_clock (point 2).
    for app in (api.main.app, desktop):
        app.dependency_overrides[local_routes.get_clock] = lambda: CLOCK
    try:
        yield TestClient(api.main.app), TestClient(desktop, headers={HEADER: TOKEN})
    finally:
        for app in (api.main.app, desktop):
            app.dependency_overrides.pop(local_routes.get_clock, None)


# Point 2: "The compute route is shared, not copied." Twins of the journeys, not the
# journeys, so a desktop copy tuned to the twenty would still be seen. Fails if the desktop
# app answers any byte differently from the server app.
CASES: dict[str, Any] = {
    "j06_364": lambda: twins._j06_like("2025-06-07"),
    "j06_365": lambda: twins._j06_like("2025-06-08"),
    "j08_whole": lambda: twins._j08_like(True),
    "j08_not_whole": lambda: twins._j08_like(False),
    "j12_no_petition": lambda: twins._no_petition_case(("2025-06-01", "2026-05-31")),
    "j04": twins._j04_like,
    "j14": twins._j14_like,
}


@pytest.mark.parametrize("name", sorted(CASES))
def test_point_2_a_twin_gives_byte_identical_json_from_both_apps(
    apps: tuple[TestClient, TestClient], name: str
) -> None:
    server, desktop = apps
    body = CASES[name]()
    a = server.post("/v1/compute", json=body)
    b = desktop.post("/v1/compute", json=body)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)


# Point 1: "It does not serve /v1/compute/f1, /v1/status or /ops/*." Asked with the right
# token, so the answer is the router's, not the guard's: 404, a path the app does not have.
# Fails if any of them, or FastAPI's own pages, answers.
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("POST", "/v1/compute/f1"),
        ("GET", "/v1/status"),
        ("GET", "/ops/v1/status"),
        ("GET", "/openapi.json"),
        ("GET", "/docs"),
        ("GET", "/redoc"),
    ],
)
def test_point_1_a_server_only_path_is_not_served(
    apps: tuple[TestClient, TestClient], method: str, path: str
) -> None:
    _, desktop = apps
    assert desktop.request(method, path, json={} if method == "POST" else None).status_code == 404


# Point 9: "Every route, /health included, requires the X-Duly-Local header (compared with
# hmac.compare_digest)." Near misses: the token one character short, one character longer,
# the last character changed, and in capitals (hex is lower case, so every letter differs).
# Fails on a prefix match, a case-blind match, or a guard that only checks the header is set.
NEAR_MISSES = [TOKEN[:-1], TOKEN + "0", TOKEN[:-1] + "e", TOKEN.upper()]


@pytest.mark.parametrize("sent", NEAR_MISSES)
@pytest.mark.parametrize(
    ("method", "path"), [("GET", "/health"), ("GET", "/version"), ("POST", "/v1/compute")]
)
def test_point_9_a_near_miss_token_is_refused(sent: str, method: str, path: str) -> None:
    client = TestClient(desktop_main.create_app(TOKEN), headers={HEADER: sent})
    body = twins._j04_like() if method == "POST" else None
    assert client.request(method, path, json=body).status_code == 403


def test_point_9_the_near_misses_differ_from_the_token() -> None:
    # Guards the list: "5f" * 32 ends in "f", so [:-1] + "e" differs; upper() turns every
    # "f" into "F". Fails if a near miss is the token itself.
    assert TOKEN not in NEAR_MISSES
    client = TestClient(desktop_main.create_app(TOKEN), headers={HEADER: TOKEN})
    assert client.get("/health").status_code == 200
