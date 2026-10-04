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
from jsonschema import Draft202012Validator, FormatChecker

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


# The W2-P3 review (reviews/w2-p3.md) and DECISIONS.md D95. Each test names its finding.
# Written before the fixes: those on findings 2 and 6 and the notes cannot pass yet.

UPDATE_SCHEMA = json.loads((REPO_ROOT / "contracts" / "update.schema.json").read_text())
# One update that follows update.schema.json and that publish_blockers passes: every claim
# primary, quoted, found and saved; both checks passed; approved by the founder with a time.
PASSING: dict[str, Any] = {
    "id": "review-w2p3-passing",
    "headline": "A court order on the rule",
    "legal_status": "enjoined",
    "status_as_of": "2026-09-14",
    "claims": [
        {
            "text": "A court blocked the rule nationwide.",
            "quote": "is hereby enjoined",
            "source_url": "https://www.courtlistener.com/docket/1/",
            "source_kind": "primary",
            "snapshot_sha256": "a" * 64,
            "quote_found": True,
        }
    ],
    "categories": ["f1"],
    "stages": ["opt"],
    "checks": {"independent_check_passed": True, "refutation_survived": True},
    "approval": {"approved": True, "approved_by": "founder", "approved_at": "2026-09-15T10:00:00Z"},
    "history": [],
}


def _refused(rid: str, path: tuple[Any, ...], value: Any) -> dict[str, Any]:
    """PASSING under another id, with the value at path replaced, or removed for None."""
    update: dict[str, Any] = json.loads(json.dumps(PASSING))
    update["id"] = rid
    node = update
    for key in path[:-1]:
        node = node[key]
    if value is None:
        del node[path[-1]]
    else:
        node[path[-1]] = value
    return update


def _update_problems(update: dict[str, Any]) -> list[str]:
    validator = Draft202012Validator(UPDATE_SCHEMA, format_checker=FormatChecker())
    return [e.message for e in validator.iter_errors(update)]


# Finding 2: three that publish_blockers passes (it tests truthiness) but update.schema.json
# refuses. Finding 3: one that follows the schema and that publish_blockers refuses.
OUTSIDE_THE_SCHEMA = [
    _refused("review-w2p3-approved-string", ("approval", "approved"), "false"),
    _refused("review-w2p3-quote-found-string", ("claims", 0, "quote_found"), "false"),
    _refused("review-w2p3-no-approved-at", ("approval", "approved_at"), None),
]
BLOCKED = _refused("review-w2p3-blocked", ("checks", "refutation_survived"), False)


@pytest.fixture
def published(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """api.case.PUBLISHED pointed at a folder holding PASSING and the four refused files."""
    for update in (PASSING, *OUTSIDE_THE_SCHEMA, BLOCKED):
        (tmp_path / f"{update['id']}.json").write_text(json.dumps(update))
    monkeypatch.setattr(importlib.import_module("api.case"), "PUBLISHED", tmp_path)
    return tmp_path


def test_review_w2p3_2_the_planted_files_are_what_they_say() -> None:
    # Guards the two tests below from passing on a wrong fixture: PASSING follows the schema
    # and has no blockers; each of the three follows publish_blockers but not the schema
    # (so only a schema check refuses it); BLOCKED follows the schema and has a blocker.
    assert (_update_problems(PASSING), publish_blockers(PASSING)) == ([], ())
    for update in OUTSIDE_THE_SCHEMA:
        assert _update_problems(update) != [], update["id"]
        assert publish_blockers(update) == (), update["id"]
    assert _update_problems(BLOCKED) == []
    assert publish_blockers(BLOCKED) == ("refutation_not_survived",)


@pytest.mark.parametrize("query", ["", "?categories=f1"])
def test_review_w2p3_2_3_only_a_file_that_follows_the_schema_and_passes_is_served(
    apps: tuple[TestClient, TestClient], published: Path, query: str
) -> None:
    # Finding 2 (an update outside update.schema.json is served) and finding 3 (mutant M3,
    # the publish_blockers filter removed). openapi /v1/updates: "a file that does not follow
    # it is never returned; then publish_blockers must return nothing"; D95 (2). Of the five
    # files, only PASSING is served, as its file holds it, by both apps alike. Fails today on
    # the three string or missing values; fails on M3 by serving BLOCKED too.
    assert len(list(published.glob("*.json"))) == 5
    server, desktop = apps
    a = server.get(f"/v1/updates{query}", headers=WITH_TOKEN)
    b = desktop.get(f"/v1/updates{query}", headers=WITH_TOKEN)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)
    assert _updates_problems(a.json()) == []
    assert _shown(a.json()) == [PASSING]


def test_review_w2p3_2_a_file_that_is_not_json_is_skipped_and_the_rest_is_served(
    apps: tuple[TestClient, TestClient], tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # reviews/w2-p3.md finding 2: pipeline/published/ holding one valid, unblocked update and
    # one file containing `{not json` gave a 500, so the valid update was not served either.
    # openapi /v1/updates: "a file that does not follow it is never returned"; a file that is
    # not JSON is the plainest such file. Both apps answer 200 with PASSING only. Fails while
    # api/case.py lets json.loads raise on the bad file (500), or serves nothing.
    (tmp_path / f"{PASSING['id']}.json").write_text(json.dumps(PASSING))
    (tmp_path / "review-w2p3-not-json.json").write_text("{not json")
    monkeypatch.setattr(importlib.import_module("api.case"), "PUBLISHED", tmp_path)
    server, desktop = apps
    a = server.get("/v1/updates", headers=WITH_TOKEN)
    b = desktop.get("/v1/updates", headers=WITH_TOKEN)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)
    assert _updates_problems(a.json()) == []
    assert _shown(a.json()) == [PASSING]


def test_review_w2p4_8_a_published_file_that_is_not_utf8_is_skipped_and_the_rest_is_served(
    apps: tuple[TestClient, TestClient], tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # reviews/w2-p4.md finding 8 (a regression of reviews/w2-p3.md finding 2): a published
    # file holding the bytes ff fe 7b made read_text() raise UnicodeDecodeError, which is not
    # JSONDecodeError, so GET /v1/updates gave a 500 again. openapi /v1/updates: "a file that
    # does not follow it is never returned". Both apps answer 200 with PASSING only. Fails
    # while api/case.py catches JSONDecodeError alone.
    (tmp_path / f"{PASSING['id']}.json").write_text(json.dumps(PASSING))
    (tmp_path / "review-w2p4-not-utf8.json").write_bytes(b"\xff\xfe\x7b")
    monkeypatch.setattr(importlib.import_module("api.case"), "PUBLISHED", tmp_path)
    server, desktop = apps
    a = server.get("/v1/updates", headers=WITH_TOKEN)
    b = desktop.get("/v1/updates", headers=WITH_TOKEN)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)
    assert _updates_problems(a.json()) == []
    assert _shown(a.json()) == [PASSING]


# Finding 6 and D95 (3): Duly's own limits in schedule.schema.json, days 36525, business days
# 260, months 1200. One over each is outside the contract, so a 422 from both apps alike.


@pytest.mark.parametrize(
    "add", [{"days": 36526}, {"business_days": 261}, {"months": 1201}], ids=lambda a: str(a)
)
def test_review_w2p3_6_an_offset_over_duly_s_limit_is_a_422(
    apps: tuple[TestClient, TestClient], add: dict[str, int]
) -> None:
    # Fails if a body past the limit is dated (today: days 36526 is dated, months 1201 is
    # 2126-10-29) or the two apps refuse differently.
    body = {"case": CASE, "requests": [req("t", {"today": True}, add)]}
    assert _problems(body, "request") != []
    server, desktop = apps
    a = server.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    b = desktop.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    assert a.status_code == 422, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)


@pytest.mark.parametrize(
    ("base", "add", "sign"),
    [
        # Today 2026-09-29 plus 36525 days, the limit itself, is in 2126: after 2099-12-31.
        ({"today": True}, {"days": 36525}, 1),
        # Today plus 1200 months is 2126-09-29: after 2099-12-31.
        ({"today": True}, {"months": 1200}, 1),
        # The review's inputs: 0001-01-01 back 1 day is before date.min (500 today).
        ({"date": "0001-01-01"}, {"days": 1}, -1),
    ],
    ids=["days_36525", "months_1200", "before_year_1"],
)
def test_review_w2p3_6_a_body_inside_the_limits_is_answered_never_a_500(
    apps: tuple[TestClient, TestClient], base: dict[str, Any], add: dict[str, int], sign: int
) -> None:
    # Finding 6, D95 (3): "a request the engine cannot date ... is answered with its reason,
    # never a failed body"; openapi: "A request the engine cannot date is not a 422". Each is
    # inside the contract, so 200, a null date and outside_readable_dates, alike from both
    # apps. Fails on the OverflowError (500) today.
    body = {"case": CASE, "requests": [req("t", base, add, sign)]}
    assert _problems(body, "request") == []
    server, desktop = apps
    a = server.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    b = desktop.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)
    assert _problems(a.json(), "response") == []
    (answer,) = a.json()["dates"]
    assert (answer["date"], answer.get("missing")) == (None, "outside_readable_dates")


def test_review_w2p3_5_a_day_with_no_holiday_row_is_answered_not_a_422(
    apps: tuple[TestClient, TestClient],
) -> None:
    # Finding 5 and the notes ("One business-day request that crosses a day with no holiday
    # row turns the whole body into a 422"), D95 (3). Mon 1985-12-30 plus 3 business days
    # crosses Tue 1985-12-31, before the first holiday row (1986-01-01): no date,
    # holidays_not_known. Today 2026-09-29 plus 1 day is 2026-09-30, 1 day away. Fails on the
    # 422 given today.
    body = {
        "case": CASE,
        "requests": [
            req("old", {"date": "1985-12-30"}, {"business_days": 3}),
            req("new", {"today": True}, {"days": 1}),
        ],
    }
    server, desktop = apps
    a = server.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    b = desktop.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)
    old, new = a.json()["dates"]
    assert (old["date"], old.get("missing")) == (None, "holidays_not_known")
    assert (new["date"], new["days_away"]) == ("2026-09-30", 1)


# The review's notes.


def test_review_w2p3_note_two_requests_with_one_id_are_a_422(
    apps: tuple[TestClient, TestClient],
) -> None:
    # schedule.schema.json id: "Unique within one request"; openapi /v1/schedule 422: "two
    # requests share an id". Fails if both are answered (today).
    body = {
        "case": CASE,
        "requests": [
            req("dup", {"today": True}, {"days": 1}),
            req("dup", {"today": True}, {"days": 2}),
        ],
    }
    server, desktop = apps
    a = server.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    b = desktop.post("/v1/schedule", json=body, headers=WITH_TOKEN)
    assert a.status_code == 422, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)


@pytest.mark.parametrize("categories", ["f1_x", "f1.opt", "F1", "f1,o_1"])
def test_review_w2p3_note_a_category_outside_the_pattern_is_a_422(
    apps: tuple[TestClient, TestClient], categories: str
) -> None:
    # openapi /v1/updates, categories: items pattern ^[a-z0-9]+$. "_" and "." are outside it
    # (the route takes them today); so is a capital. Fails if any is answered 200.
    server, desktop = apps
    a = server.get(f"/v1/updates?categories={categories}", headers=WITH_TOKEN)
    b = desktop.get(f"/v1/updates?categories={categories}", headers=WITH_TOKEN)
    assert a.status_code == 422, a.text
    assert b.status_code == 422, b.text
