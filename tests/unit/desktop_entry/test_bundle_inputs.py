"""What goes into the Python bundled inside the desktop app.

specs/step-w/SPEC-W1.md section 3:

- Point 13: the slim dependency set is the `desktop` dependency group in pyproject.toml,
  locked in uv.lock: fastapi, uvicorn (plain, not `[standard]`), pydantic, pyyaml, jsonschema,
  tzdata. Checked by running `uv export --frozen --only-group desktop --no-hashes` (offline,
  from uv.lock) and failing if anthropic, langgraph, langchain-*, psycopg*, sqlalchemy or
  pydantic-settings appears in the resolved set, directly or as a dependency.
- Point 14: the source files copied are an allowlist, desktop/python/bundle.json: engine/**,
  api/__init__.py, api/desktop_main.py, api/local_routes.py, api/case.py, api/case_f1.py,
  api/local_token.py, a launcher duly_engine.py, rulepacks/*/v*/parameters.yaml, and from
  contracts/ only case.schema.json, case_f1.schema.json, rulepack.schema.json and
  product_settings.yaml (DECISIONS.md D95 adds schedule.schema.json and update.schema.json,
  which W2's routes read, and pipeline/published/*.json, SPEC-W2 point 47; nothing else from
  pipeline/). Not rulepacks' sources/, assistant/, pipeline/, api/main.py,
  api/settings.py, api/db.py or api/worker.py. The tree keeps the repo's relative layout, so
  engine.rulepack.REPO_ROOT works unchanged. Checked by: the allowlist names no forbidden
  path; every file it names exists; assistant/providers.py matches no pattern; the engine
  loads every pack from a temporary copy made from the allowlist alone; D95 (1): a test runs
  the routes from a tree built from the allowlist alone, and they answer as the server does.

Written from the SPEC before desktop/python/bundle.json exists, so the point 14 tests fail
until L-desktop writes it. The file is an object: "include" holds the patterns that must each
match a file, and "optional" those that may match none (DECISIONS.md D96: pipeline/published/
is empty until the founder approves an update, so pipeline/published/*.json is optional, and
make desktop-python works while it is empty). The point 14 checks read both lists. A pattern
is a path relative to the repository root, read as a pathlib glob; a pattern that matches a
folder takes every file under it.
"""

import json
import re
import secrets
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

import api.main
from api import case as records_case
from api import local_routes
from api.local_token import TOKEN_HEADER
from engine.rulepack import load_all
from tests.support.records_case import CLOCK
from tests.unit.acceptance import test_journeys as journeys
from tests.unit.api.test_local_routes_w2 import PASSING
from tests.unit.engine.test_schedule import CASE as SCHEDULE_CASE
from tests.unit.engine.test_schedule import CLOCK as SCHEDULE_CLOCK

REPO_ROOT = Path(__file__).resolve().parents[3]
BUNDLE_JSON = REPO_ROOT / "desktop" / "python" / "bundle.json"

# Point 13, word for word: the six the group holds.
DESKTOP_GROUP = {"fastapi", "uvicorn", "pydantic", "pyyaml", "jsonschema", "tzdata"}
# Point 13: "anthropic, langgraph, langchain-*, psycopg*, sqlalchemy, pydantic-settings".
FORBIDDEN_DISTRIBUTION = re.compile(
    r"^(anthropic|langgraph(-.*)?|langchain-.*|psycopg.*|sqlalchemy|pydantic-settings)$"
)
# Point 13: uvicorn plain, not [standard]. These four are what [standard] adds on macOS
# (uvicorn's own extra); none of them is pulled in by plain uvicorn.
UVICORN_STANDARD_ONLY = {"uvloop", "httptools", "watchfiles", "websockets"}

# Point 14: the api files and contracts files the bundle holds, and no others.
API_FILES = {
    "api/__init__.py",
    "api/desktop_main.py",
    "api/local_routes.py",
    "api/case.py",
    "api/case_f1.py",
    "api/local_token.py",
}
CONTRACT_FILES = {
    "contracts/case.schema.json",
    "contracts/case_f1.schema.json",
    "contracts/rulepack.schema.json",
    "contracts/product_settings.yaml",
    # D95 (1): the schemas POST /v1/schedule and GET /v1/updates read.
    "contracts/schedule.schema.json",
    "contracts/update.schema.json",
}
# D95 (1): the published updates GET /v1/updates serves, and nothing else from pipeline/.
PUBLISHED_PATTERN = "pipeline/published/*.json"
PUBLISHED = re.compile(r"^pipeline/published/[^/]+\.json$")
PARAMETERS = re.compile(r"^rulepacks/[^/]+/v[^/]+/parameters\.yaml$")
LAUNCHER = "duly_engine.py"


def _normalise(name: str) -> str:
    """A distribution name as PEP 503 compares it."""
    return re.sub(r"[-_.]+", "-", name).lower()


# Point 13


def _desktop_group() -> list[str]:
    data = tomllib.loads((REPO_ROOT / "pyproject.toml").read_text())
    group: list[str] = data["dependency-groups"]["desktop"]
    return group


def _resolved_desktop_set() -> set[str]:
    uv = shutil.which("uv")
    assert uv is not None, "uv is on PATH wherever the done commands run (uv run ...)"
    res = subprocess.run(
        [uv, "export", "--frozen", "--only-group", "desktop", "--no-hashes", "--no-header"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert res.returncode == 0, res.stderr
    names = set()
    for line in res.stdout.splitlines():
        # "name==1.2.3", "name[extra]==1.2.3" or "name==1.2.3 ; marker"; comments and
        # "# via" lines start with a space or #.
        match = re.match(r"^([A-Za-z0-9][A-Za-z0-9._-]*)(\[[^\]]*\])?==", line)
        if match:
            names.add(_normalise(match.group(1)))
    return names


def test_point_13_the_desktop_group_holds_the_six_and_uvicorn_is_plain() -> None:
    # Point 13 names the group's members. Fails if a member is missing, if one outside the
    # six is added, or if uvicorn carries an extra ("plain, not [standard]").
    group = _desktop_group()
    names = {_normalise(re.split(r"[\[<>=!~ ;]", spec, maxsplit=1)[0]) for spec in group}
    assert names == DESKTOP_GROUP
    uvicorn = [spec for spec in group if _normalise(re.split(r"[\[<>=!~ ;]", spec)[0]) == "uvicorn"]
    assert uvicorn
    assert [spec for spec in uvicorn if "[" in spec] == []


def test_point_13_the_resolved_desktop_set_holds_no_server_only_distribution() -> None:
    # Point 13: the resolved set, directly or as a dependency. Fails if any forbidden
    # distribution is reachable from the group in uv.lock (for example uvicorn[standard]
    # or a dependency that pulls in sqlalchemy).
    resolved = _resolved_desktop_set()
    assert resolved >= DESKTOP_GROUP, sorted(DESKTOP_GROUP - resolved)
    assert sorted(n for n in resolved if FORBIDDEN_DISTRIBUTION.match(n)) == []


def test_point_13_the_resolved_desktop_set_holds_nothing_only_uvicorn_standard_adds() -> None:
    # Point 13: "uvicorn (plain, not [standard])". Fails if the lock resolves the group with
    # uvicorn's standard extra, which brings uvloop, httptools, watchfiles and websockets.
    assert sorted(_resolved_desktop_set() & UVICORN_STANDARD_ONLY) == []


def test_point_13_the_forbidden_pattern_catches_each_named_distribution() -> None:
    # Guards the check above: each name point 13 forbids, as uv writes it, is caught, and the
    # six allowed are not. Fails if the pattern is narrowed.
    for name in (
        "anthropic",
        "langgraph",
        "langgraph-checkpoint",
        "langchain-core",
        "psycopg",
        "psycopg-binary",
        "sqlalchemy",
        "pydantic-settings",
    ):
        assert FORBIDDEN_DISTRIBUTION.match(_normalise(name)), name
    assert [n for n in DESKTOP_GROUP if FORBIDDEN_DISTRIBUTION.match(n)] == []


# Point 14


def _lists() -> tuple[list[str], list[str]]:
    """The include and optional lists of the allowlist (D96)."""
    assert BUNDLE_JSON.is_file(), "desktop/python/bundle.json is the allowlist (point 14)"
    data: Any = json.loads(BUNDLE_JSON.read_text())
    assert isinstance(data, dict), "the allowlist is an object with include and optional"
    include, optional = data.get("include"), data.get("optional")
    for patterns in (include, optional):
        assert isinstance(patterns, list), "each list is a list of patterns"
        assert all(isinstance(p, str) for p in patterns), patterns
    assert include, "the allowlist includes at least one pattern"
    return include, optional


def _patterns() -> list[str]:
    """Every pattern the allowlist names, from both lists."""
    include, optional = _lists()
    return [*include, *optional]


def _files_of(pattern: str) -> set[str]:
    """Repo-relative files one pattern takes; a matched folder takes every file under it."""
    found: set[str] = set()
    for match in REPO_ROOT.glob(pattern):
        under = match.rglob("*") if match.is_dir() else [match]
        for path in under:
            rel = path.relative_to(REPO_ROOT)
            if path.is_file() and "__pycache__" not in rel.parts:
                found.add(rel.as_posix())
    return found


def _allowlisted() -> set[str]:
    files: set[str] = set()
    for pattern in _patterns():
        files |= _files_of(pattern)
    return files


def _not_allowed(rel: str) -> bool:
    """A file point 14 does not let into the bundle."""
    if rel.startswith("engine/"):
        return False
    if rel in API_FILES or rel in CONTRACT_FILES or PARAMETERS.match(rel) or PUBLISHED.match(rel):
        return False
    return Path(rel).name != LAUNCHER


def test_point_14_every_pattern_names_files_that_exist() -> None:
    # "every file it names exists". Fails on an included pattern that matches nothing, such as
    # a misspelt path or a file not yet written. D95 keeps the articles in pipeline/drafts
    # until the founder approves them, so pipeline/published/*.json names no file yet; D96
    # puts it in the optional list, which alone may match nothing.
    include, _ = _lists()
    assert [p for p in include if not _files_of(p)] == []


def test_review_w2p4_12_published_updates_are_optional_and_not_included() -> None:
    # reviews/w2-p4.md finding 12: buildpython.test.ts fails on a clean checkout, because
    # bundle.json's include list names pipeline/published/*.json and the folder is absent.
    # D96: "The bundle's pipeline/published/*.json is an optional pattern, since the folder is
    # empty until the founder approves an update". Fails while the pattern is in include, or
    # missing from optional.
    include, optional = _lists()
    assert PUBLISHED_PATTERN in optional
    assert PUBLISHED_PATTERN not in include
    # Nothing else is optional: every other file point 14 names exists and stays included.
    assert optional == [PUBLISHED_PATTERN]


def test_point_14_the_allowlist_names_no_forbidden_path() -> None:
    # The SPEC's list of what is not copied: rulepacks' sources/, assistant/, pipeline/,
    # api/main.py, api/settings.py, api/db.py, api/worker.py; contracts/ beyond the six
    # named; pipeline/ beyond published/*.json (D95). Fails if any pattern takes such a file,
    # for example "api/*.py", "rulepacks/**" or "pipeline".
    files = _allowlisted()
    assert sorted(f for f in files if _not_allowed(f)) == []
    for named in ("api/main.py", "api/settings.py", "api/db.py", "api/worker.py"):
        assert named not in files
    assert [f for f in files if f.startswith("assistant/")] == []
    assert [f for f in files if f.startswith("pipeline/") and not PUBLISHED.match(f)] == []
    assert [f for f in files if "/sources/" in f] == []


def test_point_14_the_guard_refuses_each_forbidden_path() -> None:
    # Guards _not_allowed itself: each path point 14 excludes is refused and each it names is
    # let through. Fails if the guard is loosened.
    for rel in (
        "assistant/providers.py",
        "pipeline/models.py",
        "api/main.py",
        "api/settings.py",
        "api/db.py",
        "api/worker.py",
        "rulepacks/f1-us/v2026.09/sources/fr-2016-04828.xml",
        "contracts/openapi.yaml",
        "pipeline/graph.py",
        "pipeline/__init__.py",
        "pipeline/drafts/2026-09-14-presidents-alliance-order.json",
        "pipeline/published/sub/x.json",
        "pipeline/published/notes.md",
    ):
        assert _not_allowed(rel), rel
    for rel in (
        "engine/path.py",
        *API_FILES,
        *CONTRACT_FILES,
        "rulepacks/f1-us/v2026.09/parameters.yaml",
        "pipeline/published/2026-09-14-presidents-alliance-order.json",
    ):
        assert not _not_allowed(rel), rel


def test_point_14_assistant_providers_matches_no_pattern() -> None:
    # Point 14 and ARCHITECTURE 7.3: no model client in a release artefact. Fails if any
    # pattern, alone, takes assistant/providers.py.
    assert (REPO_ROOT / "assistant" / "providers.py").is_file(), "the file the check is about"
    assert [p for p in _patterns() if "assistant/providers.py" in _files_of(p)] == []


def test_point_14_the_allowlist_takes_every_file_the_spec_names() -> None:
    # Fails if a named file is left out: an api module, one of the six contracts, the
    # launcher, a pack's parameters.yaml, a module of engine/, or the published updates
    # (D95: the pattern itself, optional under D96 since the folder may hold none yet, and
    # every file it holds).
    files = _allowlisted()
    assert sorted(API_FILES - files) == []
    assert sorted(CONTRACT_FILES - files) == []
    assert PUBLISHED_PATTERN in _lists()[1]
    assert sorted(_files_of(PUBLISHED_PATTERN) - files) == []
    assert [f for f in files if Path(f).name == LAUNCHER], "the launcher duly_engine.py"
    packs = {p.relative_to(REPO_ROOT).as_posix() for p in REPO_ROOT.glob("rulepacks/*/v*")}
    # Hand count: rulepacks/ holds eb1a-us, f1-us, h1b-us and o1-us, each with v2026.09: 4.
    parameters = {f"{p}/parameters.yaml" for p in packs}
    assert len(parameters) == 4
    assert sorted(parameters - files) == []
    engine_modules = {
        p.relative_to(REPO_ROOT).as_posix()
        for p in (REPO_ROOT / "engine").rglob("*.py")
        if "__pycache__" not in p.parts
    }
    assert sorted(engine_modules - files) == []


def _copy_of_the_allowlist(tmp_path: Path) -> Path:
    """A tree holding the files the allowlist takes and nothing else, in the repo's layout."""
    root = (tmp_path / "engine-root").resolve()
    for rel in _allowlisted():
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(REPO_ROOT / rel, target)
    return root


# The engine, from the copy alone. Two cases arrive on stdin: the smallest case
# case.schema.json accepts, for a category whose shipped pack has no path
# (tests/unit/api/test_compute_generic.py, _case), and journey J01 of specs/path-1, which
# walks the F-1 path and so reads the pack's parameters and contracts/product_settings.yaml.
_FROM_THE_COPY = """
import json, sys
from datetime import datetime
root = sys.argv[1]
sys.path.insert(0, root)
import engine.rulepack, engine.settings, api.case
from engine.clocks import FixedClock
packs = engine.rulepack.load_all()
cases = json.loads(sys.stdin.read())
clock = FixedClock(datetime.fromisoformat(sys.argv[2]))
print(json.dumps({
    "files": [engine.rulepack.__file__, engine.settings.__file__, api.case.__file__],
    "repo_root": str(engine.rulepack.REPO_ROOT),
    "packs": sorted([p.category, p.version] for p in packs),
    "settings": len(engine.settings.load_settings()),
    "problems": {k: api.case.first_problem(c) for k, c in cases.items()},
    "out": {k: api.case.compute(c, packs, clock) for k, c in cases.items()},
}))
"""


def test_point_14_the_engine_loads_every_pack_from_a_copy_made_from_the_allowlist_alone(
    tmp_path: Path,
) -> None:
    # Point 14: "the engine loads every pack from a temporary copy made from the allowlist
    # alone", and REPO_ROOT works unchanged. The interpreter runs with -I, so neither the
    # working folder nor PYTHONPATH puts the repository on sys.path; only the copy is added.
    # Fails if the engine or api.case reads a file the allowlist leaves out (a schema,
    # product_settings.yaml, a pack), or imports a module outside it.
    cases = {
        "h1b": {
            "categories": ["h1b"],
            "time_zone": "UTC",
            "facts": {},
            "records": [],
            "complete": {},
        },
        "J01": journeys.j01(),
    }
    root = _copy_of_the_allowlist(tmp_path)
    # records_case.CLOCK: 16:00 UTC on 2026-09-29, noon in New York, J01's zone.
    res = subprocess.run(
        [sys.executable, "-I", "-B", "-c", _FROM_THE_COPY, str(root), CLOCK.now().isoformat()],
        cwd=root,
        input=json.dumps(cases),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert res.returncode == 0, res.stderr[-2000:]
    out = json.loads(res.stdout)
    assert all(Path(f).resolve().is_relative_to(root) for f in out["files"]), out["files"]
    assert Path(out["repo_root"]).resolve() == root
    # Hand list: the four packs of rulepacks/, by the category and version each declares.
    assert out["packs"] == [
        ["eb1a", "v2026.09"],
        ["f1", "v2026.09"],
        ["h1b", "v2026.09"],
        ["o1", "v2026.09"],
    ]
    assert out["settings"] > 0
    assert out["problems"] == {"h1b": None, "J01": None}
    # RQ-A1: a category whose pack has no path is cannot_tell (category_not_covered:h1b).
    assert out["out"]["h1b"]["verdict"]["state"] == "cannot_tell"
    # The copy answers J01 exactly as the repository does, at the same clock.
    assert out["out"]["J01"] == records_case.compute(cases["J01"], load_all(), CLOCK)


@pytest.mark.parametrize("planted", ["assistant/providers.py", "rulepacks/*/v*/sources/*"])
def test_point_14_a_planted_forbidden_pattern_is_caught(planted: str) -> None:
    # Guards the allowlist check against a pattern that slips one forbidden path in. Fails if
    # _not_allowed lets the planted files through.
    files = _files_of(planted)
    assert files, f"{planted} matches files in this repository"
    assert all(_not_allowed(f) for f in files)


# D95 (1) and reviews/w2-p3.md finding 1: "The packaged engine answers both new routes exactly as
# the server does ... a test runs the routes from a tree built from the allowlist alone."
# SPEC-W2 point 47: A1 and A2 are served by api/desktop_main.py and api/main.py. The desktop
# app is made in an isolated interpreter (-I) whose sys.path is the copy, the standard library
# and site-packages, never the repository; the server app here, at the same clock.
_ROUTES_FROM_THE_COPY = """
import json, sys
from datetime import datetime
sys.path.insert(0, sys.argv[1])
from fastapi.testclient import TestClient
import api.desktop_main, api.local_routes
from api.local_token import TOKEN_HEADER
from engine.clocks import FixedClock
sent = json.loads(sys.stdin.read())
clock = FixedClock(datetime.fromisoformat(sys.argv[2]))
app = api.desktop_main.create_app(sent["token"])
app.dependency_overrides[api.local_routes.get_clock] = lambda: clock
client = TestClient(app, raise_server_exceptions=False)
headers = {TOKEN_HEADER: sent["token"]}
def body(r):
    # A 500 is plain text, not JSON.
    return r.json() if r.headers.get("content-type") == "application/json" else r.text
schedule = client.post("/v1/schedule", json=sent["schedule"], headers=headers)
updates = client.get("/v1/updates?categories=f1", headers=headers)
print(json.dumps({
    "files": sorted(
        m.__file__ for n, m in sys.modules.items()
        if n.split(".")[0] in ("api", "engine", "pipeline") and getattr(m, "__file__", None)
    ),
    "schedule": [schedule.status_code, body(schedule)],
    "updates": [updates.status_code, body(updates)],
}))
"""


def test_review_w2p3_1_the_routes_from_the_allowlist_alone_answer_as_the_server_does(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Finding 1 (blocking): from the allowlist-only tree, POST /v1/schedule answered 500
    # (FileNotFoundError: contracts/schedule.schema.json), where the repository tree gave 200.
    # The review's body: from today, add 1 day, sign 1. Hand working: the clock is 02:00 UTC
    # on 2026-09-30, 19:00 on Tue 2026-09-29 in Los Angeles, the case's zone, so today is
    # 2026-09-29 and one day on is 2026-09-30, 1 day away. GET /v1/updates?categories=f1 gives
    # the same body from both, with one passing update published to each (finding 7: the
    # desktop could not serve one, as api.case imported pipeline.graph and so langgraph).
    # Fails if either route reads a file the allowlist leaves out or imports a module outside
    # it, or if the two apps differ.
    token = secrets.token_hex(32)
    schedule_body = {
        "case": SCHEDULE_CASE,
        "requests": [{"id": "a", "from": {"today": True}, "add": {"days": 1}, "sign": 1}],
    }
    root = _copy_of_the_allowlist(tmp_path)
    # The same update published in the copy and, through api.case.PUBLISHED, for the server.
    server_published = tmp_path / "server-published"
    for folder in (root / "pipeline" / "published", server_published):
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{PASSING['id']}.json").write_text(json.dumps(PASSING))
    monkeypatch.setattr(records_case, "PUBLISHED", server_published)
    res = subprocess.run(
        [
            sys.executable,
            "-I",
            "-B",
            "-c",
            _ROUTES_FROM_THE_COPY,
            str(root),
            SCHEDULE_CLOCK.now().isoformat(),
        ],
        cwd=root,
        input=json.dumps({"token": token, "schedule": schedule_body}),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert res.returncode == 0, res.stderr[-2000:]
    desktop = json.loads(res.stdout)
    assert all(Path(f).resolve().is_relative_to(root) for f in desktop["files"]), desktop["files"]

    monkeypatch.setenv("DULY_LOCAL_TOKEN", token)
    for key in {local_routes.get_clock, api.main.get_clock}:  # type: ignore[attr-defined]
        monkeypatch.setitem(api.main.app.dependency_overrides, key, lambda: SCHEDULE_CLOCK)
    # 127.0.0.1 is inside the ops list, so the ops guard does not refuse first.
    server = TestClient(api.main.app, client=("127.0.0.1", 50000))
    headers = {TOKEN_HEADER: token}
    schedule = server.post("/v1/schedule", json=schedule_body, headers=headers)
    updates = server.get("/v1/updates?categories=f1", headers=headers)

    assert desktop["schedule"] == [200, schedule.json()]
    assert schedule.status_code == 200
    (answer,) = schedule.json()["dates"]
    assert (answer["id"], answer["date"], answer["days_away"]) == ("a", "2026-09-30", 1)
    assert desktop["updates"] == [200, updates.json()]
    assert updates.status_code == 200
    assert [e["update"] for e in updates.json()["updates"]] == [PASSING]
