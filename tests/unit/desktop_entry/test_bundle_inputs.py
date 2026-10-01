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
  product_settings.yaml. Not rulepacks' sources/, assistant/, pipeline/, api/main.py,
  api/settings.py, api/db.py or api/worker.py. The tree keeps the repo's relative layout, so
  engine.rulepack.REPO_ROOT works unchanged. Checked by: the allowlist names no forbidden
  path; every file it names exists; assistant/providers.py matches no pattern; the engine
  loads every pack from a temporary copy made from the allowlist alone.

Written from the SPEC before desktop/python/bundle.json exists, so the point 14 tests fail
until L-desktop writes it. The SPEC does not fix the file's shape; these tests read either a
JSON list of patterns, or an object whose "include" holds that list. A pattern is a path
relative to the repository root, read as a pathlib glob; a pattern that matches a folder
takes every file under it.
"""

import json
import re
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path
from typing import Any

import pytest

from api import case as records_case
from engine.rulepack import load_all
from tests.support.records_case import CLOCK
from tests.unit.acceptance import test_journeys as journeys

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
}
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


def _patterns() -> list[str]:
    assert BUNDLE_JSON.is_file(), "desktop/python/bundle.json is the allowlist (point 14)"
    data: Any = json.loads(BUNDLE_JSON.read_text())
    patterns = data["include"] if isinstance(data, dict) else data
    assert isinstance(patterns, list), "the allowlist is a list of patterns"
    assert patterns, "the allowlist names at least one pattern"
    assert all(isinstance(p, str) for p in patterns), patterns
    return patterns


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
    if rel in API_FILES or rel in CONTRACT_FILES or PARAMETERS.match(rel):
        return False
    return Path(rel).name != LAUNCHER


def test_point_14_every_pattern_names_files_that_exist() -> None:
    # "every file it names exists". Fails on a pattern that matches nothing, such as a
    # misspelt path or a file not yet written.
    assert [p for p in _patterns() if not _files_of(p)] == []


def test_point_14_the_allowlist_names_no_forbidden_path() -> None:
    # The SPEC's list of what is not copied: rulepacks' sources/, assistant/, pipeline/,
    # api/main.py, api/settings.py, api/db.py, api/worker.py; contracts/ beyond the four
    # named. Fails if any pattern takes such a file, for example "api/*.py" or "rulepacks/**".
    files = _allowlisted()
    assert sorted(f for f in files if _not_allowed(f)) == []
    for named in ("api/main.py", "api/settings.py", "api/db.py", "api/worker.py"):
        assert named not in files
    assert [f for f in files if f.startswith(("assistant/", "pipeline/"))] == []
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
    ):
        assert _not_allowed(rel), rel
    for rel in (
        "engine/path.py",
        *API_FILES,
        *CONTRACT_FILES,
        "rulepacks/f1-us/v2026.09/parameters.yaml",
    ):
        assert not _not_allowed(rel), rel


def test_point_14_assistant_providers_matches_no_pattern() -> None:
    # Point 14 and ARCHITECTURE 7.3: no model client in a release artefact. Fails if any
    # pattern, alone, takes assistant/providers.py.
    assert (REPO_ROOT / "assistant" / "providers.py").is_file(), "the file the check is about"
    assert [p for p in _patterns() if "assistant/providers.py" in _files_of(p)] == []


def test_point_14_the_allowlist_takes_every_file_the_spec_names() -> None:
    # Fails if a named file is left out: an api module, one of the four contracts, the
    # launcher, a pack's parameters.yaml, or a module of engine/.
    files = _allowlisted()
    assert sorted(API_FILES - files) == []
    assert sorted(CONTRACT_FILES - files) == []
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
    root = (tmp_path / "engine-root").resolve()
    for rel in _allowlisted():
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(REPO_ROOT / rel, target)
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
