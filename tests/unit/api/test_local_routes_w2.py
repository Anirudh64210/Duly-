"""A1 POST /v1/schedule and A2 GET /v1/updates, served by the server app and the desktop engine.

specs/step-w/SPEC-W2.md point 47: "A1 POST /v1/schedule in api/local_routes.py, served by
api/desktop_main.py and api/main.py; A2 GET /v1/updates ... in local_routes, reading the
published updates bundled with the app"; point 51 (this file). contracts/openapi.yaml, paths
/v1/schedule (request and response of contracts/schedule.schema.json) and /v1/updates
("Approved law updates only: those for which publish_blockers returns nothing"; the body is
components Updates). CLAUDE.md: "A law update is shown to a user only when publish_blockers
returns nothing."

The launch token: specs/step-w/SPEC-W1.md point 9 (the desktop engine refuses every route
without it) and specs/desktop-1/SPEC.md (api.main, with DULY_LOCAL_TOKEN set, refuses every
call but /health without it), both 403. The clock is the dependency get_clock of
api.local_routes and api.main, overridden under both, as tests/unit/desktop_entry does.

Written before the routes exist: these cannot pass yet.
"""

import importlib
import json
import secrets
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
import yaml
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

import api.main
from pipeline.graph import publish_blockers
from tests.unit.desktop_entry.test_desktop_main import _served
from tests.unit.engine.test_schedule import CAP_ITEM, CASE, CLOCK, UNDATED_ITEM, _problems, req

REPO_ROOT = Path(__file__).resolve().parents[3]
PUBLISHED = REPO_ROOT / "pipeline" / "published"
DRAFTS = REPO_ROOT / "pipeline" / "drafts"
OPENAPI = yaml.safe_load((REPO_ROOT / "contracts" / "openapi.yaml").read_text())
TOKEN = secrets.token_hex(32)  # 32 random bytes, as main makes them (SPEC-W1 point 9)
HEADER = "X-Duly-Local"


@pytest.fixture
def apps(monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[TestClient, TestClient]]:
    """api.main's app with DULY_LOCAL_TOKEN set, and the desktop app made with the same
    token, both at CLOCK. Neither client sends the token unless a test adds it."""
    monkeypatch.setenv("DULY_LOCAL_TOKEN", TOKEN)
    local_routes = importlib.import_module("api.local_routes")
    desktop = importlib.import_module("api.desktop_main").create_app(TOKEN)
    keys = {local_routes.get_clock, api.main.get_clock}  # type: ignore[attr-defined]
    for app in (api.main.app, desktop):
        for key in keys:
            app.dependency_overrides[key] = lambda: CLOCK
    try:
        # 127.0.0.1 is where the shell calls from, inside the ops list, so the ops guard does
        # not refuse first and hide the token check.
        yield TestClient(api.main.app, client=("127.0.0.1", 50000)), TestClient(desktop)
    finally:
        for app in (api.main.app, desktop):
            for key in keys:
                app.dependency_overrides.pop(key, None)


WITH_TOKEN = {HEADER: TOKEN}


# Both apps serve the one route of local_routes.


@pytest.mark.parametrize(("path", "method"), [("/v1/schedule", "POST"), ("/v1/updates", "GET")])
def test_both_apps_serve_the_one_route_of_local_routes(path: str, method: str) -> None:
    # Point 47: the routes live in api/local_routes.py and both apps mount them. Fails if
    # either app is missing the route or serves its own copy.
    desktop = importlib.import_module("api.desktop_main").create_app(TOKEN)

    def endpoint(app: Any) -> Any:
        found = [e for p, m, e in _served(app.routes) if (p, m) == (path, frozenset({method}))]
        assert len(found) == 1, path
        return found[0]

    shared = endpoint(api.main.app)
    assert shared.__module__ == "api.local_routes"
    assert endpoint(desktop) is shared


# The token.


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [("POST", "/v1/schedule", {"case": CASE, "requests": []}), ("GET", "/v1/updates", None)],
)
def test_no_route_answers_without_the_launch_token(
    apps: tuple[TestClient, TestClient], method: str, path: str, body: Any
) -> None:
    # SPEC-W1 point 9 and specs/desktop-1: no token, a wrong one of the same length, one a
    # byte short, and an empty one are each refused with 403, by both apps. Fails if a new
    # route is mounted outside the token guard.
    wrong = secrets.token_hex(32)
    assert wrong != TOKEN
    for client in apps:
        for headers in ({}, {HEADER: wrong}, {HEADER: TOKEN[:-1]}, {HEADER: ""}):
            response = client.request(method, path, json=body, headers=headers)
            assert response.status_code == 403, (path, headers)


# A1, POST /v1/schedule.

# Hand working, each as in tests/unit/engine/test_schedule.py:
# - Tue 2026-11-24 plus 3 business days: Wed 25 (1), Thu 26 Thanksgiving skipped, Fri 27 (2),
#   the weekend, Mon 30 (3): 2026-11-30.
# - 2026-04-25 plus 10 days is 2026-05-05, after the OPT filing deadline 2026-05-01 (the
#   recommendation 2026-04-01 plus 30 days): 2026-05-01, capped.
# - loop.deadline_lead_days (3 days) before 2026-05-01: 2026-04-28, a planning date.
# - The STEM last day has no date in the case: no date, item_has_no_date.
# Today is 2026-09-29 in Los Angeles at the clock, so days_away of 2026-11-30 is 1 (Sep 30)
# + 31 (October) + 30 (November) = 62.
REQUESTS: list[dict[str, Any]] = [
    req("visit.followup", {"date": "2026-11-24"}, {"business_days": 3}),
    req("opt.file.followup", {"date": "2026-04-25"}, {"days": 10}, 1, cap=CAP_ITEM),
    req("opt.file.reminder", {"item": CAP_ITEM}, {"setting": "loop.deadline_lead_days"}, -1),
    req("stem.file.reminder", {"item": UNDATED_ITEM}, {"days": 3}, -1),
]
SCHEDULE_BODY: dict[str, Any] = {"case": CASE, "requests": REQUESTS}


def test_schedule_gives_the_same_json_from_both_apps(apps: tuple[TestClient, TestClient]) -> None:
    # Point 47 and schedule.schema.json: one answer per request in order, each worked above,
    # the body a response under the contract, byte for byte the same from both apps. Fails
    # if either app dates differently, drops a request, or answers outside the contract.
    server, desktop = apps
    assert _problems(SCHEDULE_BODY, "request") == []
    a = server.post("/v1/schedule", json=SCHEDULE_BODY, headers=WITH_TOKEN)
    b = desktop.post("/v1/schedule", json=SCHEDULE_BODY, headers=WITH_TOKEN)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)
    out = a.json()
    assert _problems(out, "response") == []
    assert out["today"] == {"date": "2026-09-29", "time_zone": CASE["time_zone"]}
    found = {d["id"]: d for d in out["dates"]}
    assert [d["id"] for d in out["dates"]] == [r["id"] for r in REQUESTS]
    assert (found["visit.followup"]["date"], found["visit.followup"]["days_away"]) == (
        "2026-11-30",
        62,
    )
    assert (found["opt.file.followup"]["date"], found["opt.file.followup"].get("capped")) == (
        "2026-05-01",
        True,
    )
    assert (found["opt.file.reminder"]["date"], found["opt.file.reminder"].get("planning")) == (
        "2026-04-28",
        True,
    )
    none = found["stem.file.reminder"]
    assert (none["date"], none["days_away"]) == (None, None)
    assert none.get("missing") == "item_has_no_date"


@pytest.mark.parametrize(
    "body",
    [
        {"case": CASE},  # no requests
        {"case": CASE, "requests": [{**REQUESTS[0], "sign": 2}]},
        {"case": CASE, "requests": [{**REQUESTS[0], "id": "Not An Id"}]},
        {"requests": []},  # no case
    ],
    ids=["no_requests", "sign_2", "bad_id", "no_case"],
)
def test_schedule_refuses_a_body_outside_the_contract_alike(
    apps: tuple[TestClient, TestClient], body: dict[str, Any]
) -> None:
    # openapi /v1/schedule, 422: "The body does not match the contract". Both apps refuse in
    # the same words. Fails if a body outside the contract is dated, or the apps differ.
    assert _problems(body, "request") != []
    server, desktop = apps
    a = server.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    b = desktop.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    assert a.status_code == 422, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)


# A2, GET /v1/updates.


def _updates_problems(body: Any) -> list[str]:
    schema = {"components": OPENAPI["components"], "$ref": "#/components/schemas/Updates"}
    return [e.message for e in Draft202012Validator(schema).iter_errors(body)]


def _files(folder: Path) -> list[dict[str, Any]]:
    return [json.loads(p.read_text()) for p in sorted(folder.glob("*.json"))]


def _shown(body: dict[str, Any]) -> list[dict[str, Any]]:
    return [entry["update"] for entry in body["updates"]]


def _by_id(updates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(updates, key=lambda u: str(u.get("id")))


@pytest.mark.parametrize("query", ["", "?categories=f1", "?categories=f1&stages=opt&fields=a1"])
def test_updates_are_the_published_files_that_pass_publish_blockers(
    apps: tuple[TestClient, TestClient], query: str
) -> None:
    # Point 47, A2, and openapi /v1/updates. The updates served are exactly the files in
    # pipeline/published/ for which publish_blockers returns nothing, each as its file holds
    # it; an empty list when none is published. The query only matches, it never adds an
    # update. Both apps give the same bytes. Fails if a published file that publish_blockers
    # refuses is served, if one that passes is left out, or if anything else is served.
    expected = _by_id([u for u in _files(PUBLISHED) if publish_blockers(u) == ()])
    server, desktop = apps
    a = server.get(f"/v1/updates{query}", headers=WITH_TOKEN)
    b = desktop.get(f"/v1/updates{query}", headers=WITH_TOKEN)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)
    body = a.json()
    assert _updates_problems(body) == []
    assert _by_id(_shown(body)) == expected
    assert 0 <= body["matching"] <= len(body["updates"])


def test_updates_never_serve_a_draft(apps: tuple[TestClient, TestClient]) -> None:
    # CLAUDE.md: shown "only when publish_blockers returns nothing"; a draft awaits the
    # founder's approval (plan-w2-p3.yaml, L-pipeline). Every update served passes
    # publish_blockers, and no draft's id is served. Fails if the route reads pipeline/drafts
    # or skips the check.
    drafts = _files(DRAFTS)
    published_ids = {u.get("id") for u in _files(PUBLISHED)}
    for client in apps:
        body = client.get("/v1/updates", headers=WITH_TOKEN).json()
        shown = _shown(body)
        assert [publish_blockers(u) for u in shown] == [()] * len(shown)
        served_ids = {u.get("id") for u in shown}
        assert served_ids.isdisjoint({d.get("id") for d in drafts} - published_ids)


def test_the_drafts_folder_holds_a_draft_publish_blockers_refuses() -> None:
    # Guards the test above from passing on nothing: pipeline/drafts holds at least one
    # update, and publish_blockers refuses it (no founder approval is recorded in a draft).
    drafts = _files(DRAFTS)
    assert drafts
    assert all("not_approved_in_ops" in publish_blockers(d) for d in drafts)


def test_without_a_query_nothing_is_matched(apps: tuple[TestClient, TestClient]) -> None:
    # openapi /v1/updates, categories: "Absent means no update is matched", and the desktop
    # bridge's engine.updates sends no query. matching is 0 and every matched list is empty.
    server, _ = apps
    body = server.get("/v1/updates", headers=WITH_TOKEN).json()
    assert body["matching"] == 0
    assert all(e["matched"] == {"stages": [], "fields": []} for e in body["updates"])
