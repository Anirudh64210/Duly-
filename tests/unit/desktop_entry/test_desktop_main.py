"""The slim desktop engine entrypoint, api/desktop_main.py, and its socket.

specs/step-w/SPEC-W1.md sections 1 and 2 (points 1 to 5, 7 and 9; points 6, 8, 10 and 11 are
main's side and are checked in desktop/src):

- Point 1: the app has exactly four routes, GET /health, GET /version, POST /v1/compute and
  GET /v1/status, with the shapes of openapi.yaml. Not /v1/compute/f1 or /ops/*. /v1/status
  was added on 2026-10-01: the onboarding lists the statuses from it, and the packaged app
  could not start a case without it.
- Point 2: the compute route is shared, not copied. Its body lives in api/local_routes.py,
  which imports only fastapi, api.case, api.local_token and engine/, and never api.settings,
  api.db or pydantic_settings. The twenty journeys of specs/path-1/journeys.json, sent to both
  apps with the same FixedClock, give byte-identical JSON.
- Point 3: in a fresh interpreter, after `import api.desktop_main`, none of anthropic,
  langgraph, langchain_core, psycopg, sqlalchemy, pydantic_settings, assistant,
  assistant.providers, api.settings, api.db, api.main, pipeline is in sys.modules.
- Point 4: `--mode packaged` refuses to start when DULY_ENV is set to anything but desktop;
  packaged with DULY_ENV=dev exits non-zero with a plain line. `--mode repo` allows dev.
- Point 5: uvicorn's access log is off and the level is warning; a canary sent in a request
  is not in the captured stdout or stderr.
- Point 7: the engine makes the socket itself: bound under umask 0o177, chmod 0o600, checked
  with lstat. Refuses a parent that is group or world writable, a symlinked path, a path over
  103 bytes. A stale socket file is removed only if lstat shows a socket owned by this user.
- Point 9: the token is the first line of stdin, read before binding; every route, /health
  included, requires X-Duly-Local; it is never taken from argv or the environment.
- Point 16, the repo-mode command: `python -m api.desktop_main --mode repo` with
  `--socket <path>`, and the reduced environment PATH, HOME, TMPDIR, DULY_ENV.

Written from the SPEC before api/desktop_main.py existed (SPEC-W1 point 29 step 2), and kept
unchanged in the reconcile round (step 4). Two names the SPEC does not fix were chosen here and
asked of L-api, which built them: `api.desktop_main.create_app(token)` returns the FastAPI app that
requires `token`, for the in-process checks; and the compute route's clock is the dependency
`get_clock` (the override the journeys use today on api.main), overridden here under both
api.local_routes and api.main.

A refused request is 403, as specs/desktop-1/SPEC.md "The api (L-api)" set for the token.
"""

import ast
import http.client
import importlib
import io
import json
import os
import runpy
import secrets
import socket
import stat
import subprocess
import sys
import tempfile
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.routing import APIRoute

import api.main
from tests.support.api_client import CheckedClient
from tests.support.records_case import CLOCK
from tests.unit.acceptance import test_journeys as journeys

REPO_ROOT = Path(__file__).resolve().parents[3]
TOKEN = secrets.token_hex(32)  # 32 random bytes, as main makes them (point 9)
HEADER = "X-Duly-Local"
# macOS: sun_path is 104 bytes with its closing NUL, so 103 bytes is the longest path (point 6).
LONGEST_SOCKET_PATH = 103
START_WITHIN = 60.0  # seconds; point 23's first-launch health wait
# The smallest case case.schema.json accepts (tests/unit/api/test_compute_generic.py, _case):
# h1b, whose shipped pack has no path, so the answer is cannot_tell.
H1B_CASE: dict[str, Any] = {
    "categories": ["h1b"],
    "time_zone": "UTC",
    "facts": {},
    "records": [],
    "complete": {},
}
# Point 3, word for word.
SERVER_ONLY = (
    "anthropic",
    "langgraph",
    "langchain_core",
    "psycopg",
    "sqlalchemy",
    "pydantic_settings",
    "assistant",
    "assistant.providers",
    "api.settings",
    "api.db",
    "api.main",
    "pipeline",
)


def _desktop_main() -> ModuleType:
    """Imported here, not at the top, so the file is collected before L-api writes it."""
    return importlib.import_module("api.desktop_main")


def _local_routes() -> ModuleType:
    return importlib.import_module("api.local_routes")


# Point 1


def _served(routes: list[Any], prefix: str = "") -> list[tuple[str, frozenset[str], Any]]:
    """(path, methods, endpoint) of every route an app serves; endpoint None for a route that
    is not an API route (FastAPI's /openapi.json, /docs, a mount). FastAPI 0.141, the
    version uv.lock holds, keeps an included router as one entry that wraps the router's own
    routes, so those are read through it with the prefix it was included under."""
    served: list[tuple[str, frozenset[str], Any]] = []
    for route in routes:
        if hasattr(route, "original_router"):
            inner = prefix + route.include_context.prefix
            served += _served(route.original_router.routes, inner)
        elif isinstance(route, APIRoute):
            served.append((prefix + route.path, frozenset(route.methods or ()), route.endpoint))
        else:
            served.append((prefix + getattr(route, "path", repr(route)), frozenset(), None))
    return served


def test_point_1_the_app_has_exactly_the_six_routes() -> None:
    # Fails on any other route: /v1/compute/f1, /ops/*, and FastAPI's own
    # /openapi.json, /docs and /redoc, which an app serves unless they are turned off.
    # SPEC-W2 point 47 (W2-P3) adds A1 POST /v1/schedule and A2 GET /v1/updates to the four of
    # SPEC-W1 point 1.
    app: FastAPI = _desktop_main().create_app(TOKEN)
    served = _served(app.routes)
    assert sorted((path, sorted(methods)) for path, methods, _ in served) == [
        ("/health", ["GET"]),
        ("/v1/compute", ["POST"]),
        ("/v1/schedule", ["POST"]),
        ("/v1/status", ["GET"]),
        ("/v1/updates", ["GET"]),
        ("/version", ["GET"]),
    ]
    assert all(endpoint is not None for _, _, endpoint in served)


@pytest.mark.usefixtures("no_server_token")
def test_point_1_status_lists_the_packs_as_the_server_app_does() -> None:
    # The onboarding's first question lists the categories of /v1/status. Fails if the desktop
    # engine lists other packs, another verdict or another check time than api.main. The
    # database field is left out: the server reads Postgres, the desktop has none.
    with _both_apps() as (server, desktop):
        api.main.app.dependency_overrides[api.main.get_db] = lambda: None
        try:
            with patch.object(api.main, "database_reachable", lambda _db: True):
                a = server.get("/v1/status")
        finally:
            api.main.app.dependency_overrides.pop(api.main.get_db, None)
        b = desktop.get("/v1/status")
    assert (a.status_code, b.status_code) == (200, 200)
    ours, theirs = b.json(), a.json()
    assert ours["database"] == "ok"
    assert {k: v for k, v in ours.items() if k != "database"} == {
        k: v for k, v in theirs.items() if k != "database"
    }
    assert "f1" in {pack["category"] for pack in ours["rulepacks"]}


def test_point_1_the_route_listing_sees_the_server_apps_other_routes() -> None:
    # Guards the listing: api.main's app serves /v1/compute/f1, /v1/status, /ops/v1/status
    # and /openapi.json, and _served sees each. Fails if the listing stops reading a route.
    paths = {path for path, _, _ in _served(api.main.app.routes)}
    assert {"/v1/compute/f1", "/v1/status", "/ops/v1/status", "/openapi.json"} <= paths


# Point 2


def _compute_endpoint(app: FastAPI) -> Any:
    found = [
        e
        for path, methods, e in _served(app.routes)
        if (path, methods) == ("/v1/compute", frozenset({"POST"}))
    ]
    assert len(found) == 1
    return found[0]


def test_point_2_both_apps_serve_the_one_compute_route_of_local_routes() -> None:
    # "The compute route is shared, not copied ... api/main.py and api/desktop_main.py both
    # mount it." Fails if either app serves its own copy of the function.
    shared = _compute_endpoint(api.main.app)
    assert shared.__module__ == "api.local_routes"
    assert _compute_endpoint(_desktop_main().create_app(TOKEN)) is shared


def _imports_of(path: Path) -> set[str]:
    names: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text())):
        if isinstance(node, ast.Import):
            names |= {alias.name for alias in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names.add(node.module)
    return names


def test_point_2_local_routes_imports_only_fastapi_api_case_local_token_and_engine() -> None:
    # Fails if api/local_routes.py imports api.settings (which pulls in assistant.providers),
    # api.db, pydantic_settings, or anything else outside the list. The standard library is
    # allowed. api.case_f1 is allowed too: see the dispute in tests/REPORT.json (the compute
    # body needs read_body and the refusal words, which live there, and point 14 bundles it).
    allowed_roots = {"fastapi", "starlette", "engine"}
    allowed_modules = {"api.case", "api.case_f1", "api.local_token"}
    path = REPO_ROOT / "api" / "local_routes.py"
    assert path.is_file()
    outside = sorted(
        name
        for name in _imports_of(path)
        if name.split(".")[0] not in sys.stdlib_module_names
        and name.split(".")[0] not in allowed_roots
        and name not in allowed_modules
        and name != "api"
    )
    assert outside == []


@contextmanager
def _both_apps() -> Iterator[tuple[CheckedClient, CheckedClient]]:
    """api.main's app and the desktop app, at the same FixedClock."""
    local_routes = _local_routes()
    desktop = _desktop_main().create_app(TOKEN)
    keys = {local_routes.get_clock, api.main.get_clock}  # type: ignore[attr-defined]
    for app in (api.main.app, desktop):
        for key in keys:
            app.dependency_overrides[key] = lambda: CLOCK
    try:
        yield CheckedClient(api.main.app), CheckedClient(desktop, headers={HEADER: TOKEN})
    finally:
        for app in (api.main.app, desktop):
            for key in keys:
                app.dependency_overrides.pop(key, None)


@pytest.fixture
def no_server_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """api.main without a launch token, so it answers every call (specs/desktop-1)."""
    monkeypatch.delenv("DULY_LOCAL_TOKEN", raising=False)


@pytest.mark.usefixtures("no_server_token")
@pytest.mark.parametrize("jid", sorted(journeys.JOURNEYS))
def test_point_2_each_journey_gives_byte_identical_json_from_both_apps(jid: str) -> None:
    # "sends the twenty journeys of specs/path-1/journeys.json to both apps with the same
    # FixedClock and asserts byte-identical JSON". Hand count: J01 to J20 is 20 journeys.
    # Fails if the desktop app computes in any way the server app does not.
    assert len(journeys.JOURNEYS) == 20
    with _both_apps() as (server, desktop):
        body = journeys.JOURNEYS[jid]()
        a = server.post("/v1/compute", json=body)
        b = desktop.post("/v1/compute", json=body)
    assert a.status_code == 200, a.text
    assert (b.status_code, b.content) == (a.status_code, a.content)


@pytest.mark.usefixtures("no_server_token")
@pytest.mark.parametrize("path", ["/health", "/version"])
def test_point_1_health_and_version_answer_as_the_server_app_does(path: str) -> None:
    # Point 1: "the same request and response shapes as openapi.yaml". Fails if the desktop
    # app's answer differs from api.main's.
    with _both_apps() as (server, desktop):
        a = server.get(path)
        b = desktop.get(path)
    assert a.status_code == 200
    assert (b.status_code, b.content) == (a.status_code, a.content)


# Point 3


def _loaded_after(statement: str) -> list[str]:
    """The SERVER_ONLY modules in sys.modules after `statement`, in a fresh interpreter."""
    code = (
        "import json, sys\n"
        f"{statement}\n"
        f"names = {list(SERVER_ONLY)!r}\n"
        "print(json.dumps(sorted(m for m in sys.modules\n"
        "    if any(m == n or m.startswith(n + '.') for n in names))))\n"
    )
    res = subprocess.run(
        [sys.executable, "-c", code],
        cwd=REPO_ROOT,
        env=_reduced_env(),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    assert res.returncode == 0, res.stderr[-2000:]
    loaded: list[str] = json.loads(res.stdout)
    return loaded


def test_point_3_importing_the_entrypoint_loads_nothing_server_only() -> None:
    # A subprocess, so earlier imports in this test run cannot hide a leak. Fails if
    # api/desktop_main.py, or anything it imports, imports a server-only module.
    assert _loaded_after("import api.desktop_main") == []


def test_point_2_importing_local_routes_loads_nothing_server_only() -> None:
    # Point 2: nothing in api/local_routes.py imports api.settings, api.db or
    # pydantic_settings. Fails on such an import, direct or through another module.
    assert _loaded_after("import api.local_routes") == []


def test_point_3_the_check_sees_a_server_only_import() -> None:
    # Guards the check: importing api.main (which reads api.settings and api.db) is seen.
    # Fails if _loaded_after stops reading sys.modules.
    loaded = _loaded_after("import api.main")
    assert "api.main" in loaded
    assert "api.settings" in loaded


# The engine as a process: points 4, 5, 7 and 9


def _reduced_env(**extra: str) -> dict[str, str]:
    """Point 16's reduced environment: PATH, HOME, TMPDIR, and what the test adds."""
    env = {k: os.environ[k] for k in ("PATH", "HOME", "TMPDIR") if k in os.environ}
    env.update(extra)
    return env


@pytest.fixture
def run_dir() -> Iterator[Path]:
    """A fresh 0700 folder for the socket, short enough for the 103-byte rule.

    Under TMPDIR as given, not resolved: on macOS TMPDIR runs through the /var or /tmp
    symlink, as main's fallback folder under os.tmpdir() does (point 6), so the engine must
    accept a symlinked ancestor; point 7 refuses a symlink at the socket path itself.
    """
    folder = Path(tempfile.mkdtemp(prefix="dl-"))
    folder.chmod(0o700)
    try:
        yield folder
    finally:
        for child in folder.iterdir():
            child.unlink()
        folder.rmdir()


class _UnixConnection(http.client.HTTPConnection):
    def __init__(self, socket_path: Path) -> None:
        super().__init__("localhost", timeout=30)
        self._socket_path = socket_path

    def connect(self) -> None:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(self.timeout)
        sock.connect(str(self._socket_path))
        self.sock = sock


def _request(
    socket_path: Path,
    method: str,
    path: str,
    token: str | None = TOKEN,
    body: Any = None,
) -> tuple[int, bytes]:
    headers = {} if token is None else {HEADER: token}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    conn = _UnixConnection(socket_path)
    try:
        conn.request(method, path, body=data, headers=headers)
        res = conn.getresponse()
        return res.status, res.read()
    finally:
        conn.close()


@dataclass
class _Engine:
    process: subprocess.Popen[bytes]
    socket: Path
    stdout: Path
    stderr: Path

    def output(self) -> str:
        return self.stdout.read_text(errors="replace") + self.stderr.read_text(errors="replace")


def _spawn(socket_path: Path, logs: Path, mode: str, env: dict[str, str], stdin: bytes) -> _Engine:
    logs.mkdir(parents=True, exist_ok=True)
    out, err = logs / "stdout.txt", logs / "stderr.txt"
    with out.open("wb") as o, err.open("wb") as e:
        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "api.desktop_main",
                "--mode",
                mode,
                "--socket",
                str(socket_path),
            ],
            cwd=REPO_ROOT,
            env=env,
            stdin=subprocess.PIPE,
            stdout=o,
            stderr=e,
        )
    assert process.stdin is not None
    process.stdin.write(stdin)
    process.stdin.close()
    return _Engine(process, socket_path, out, err)


def _answers(socket_path: Path) -> bool:
    try:
        status, _ = _request(socket_path, "GET", "/health")
    except OSError:
        return False
    return status == 200


@contextmanager
def _engine(
    socket_path: Path,
    logs: Path,
    *,
    mode: str = "repo",
    env: dict[str, str] | None = None,
    token: str = TOKEN,
) -> Iterator[_Engine]:
    """The engine started as main starts it, waited on until /health answers, then stopped."""
    engine = _spawn(
        socket_path, logs, mode, env or _reduced_env(DULY_ENV="dev"), (token + "\n").encode()
    )
    try:
        deadline = time.monotonic() + START_WITHIN
        while not _answers(socket_path):
            code = engine.process.poll()
            assert code is None, f"the engine ended with {code}: {engine.output()[-2000:]}"
            assert time.monotonic() < deadline, f"no health in time: {engine.output()[-2000:]}"
            time.sleep(0.1)
        yield engine
    finally:
        engine.process.terminate()
        try:
            engine.process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            engine.process.kill()
            engine.process.wait()


def _refused(
    socket_path: Path,
    logs: Path,
    *,
    mode: str = "repo",
    env: dict[str, str] | None = None,
    stdin: bytes = (TOKEN + "\n").encode(),
) -> _Engine:
    """The engine started as main starts it, expected to end on its own, non-zero."""
    engine = _spawn(socket_path, logs, mode, env or _reduced_env(DULY_ENV="dev"), stdin)
    try:
        code = engine.process.wait(timeout=START_WITHIN)
    except subprocess.TimeoutExpired:
        engine.process.kill()
        engine.process.wait()
        pytest.fail(f"the engine started instead of refusing: {engine.output()[-2000:]}")
    assert code != 0, engine.output()[-2000:]
    # A refusal by the engine, not a missing module or a crash on the way in.
    assert "No module named" not in engine.output(), engine.output()[-2000:]
    assert "Traceback" not in engine.output(), engine.output()[-2000:]
    return engine


# Point 7: the socket


def test_point_7_the_socket_is_this_users_with_mode_0600(run_dir: Path, tmp_path: Path) -> None:
    # "chmod 0o600, check with lstat". Fails if the engine leaves uvicorn's own --uds mode
    # (0666), or binds a socket that is not this user's.
    sock = run_dir / "engine.sock"
    with _engine(sock, tmp_path):
        st = sock.lstat()
        assert stat.S_ISSOCK(st.st_mode)
        assert stat.S_IMODE(st.st_mode) == 0o600
        assert st.st_uid == os.getuid()


@pytest.mark.parametrize(
    "mode",
    [0o720, 0o702, 0o777],
    ids=["group-writable", "world-writable", "both"],
)
def test_point_7_refuses_a_parent_that_others_can_write(
    run_dir: Path, tmp_path: Path, mode: int
) -> None:
    # "refuses a parent that is group or world writable". Fails if the engine binds there.
    run_dir.chmod(mode)
    try:
        sock = run_dir / "engine.sock"
        _refused(sock, tmp_path)
        assert not os.path.lexists(sock)
    finally:
        run_dir.chmod(0o700)


def test_point_7_refuses_a_symlink_at_the_socket_path(run_dir: Path, tmp_path: Path) -> None:
    # "refuses a symlinked path". Fails if the engine follows, removes or binds over the link.
    target = tmp_path / "elsewhere"
    target.write_text("not the engine's")
    sock = run_dir / "engine.sock"
    sock.symlink_to(target)
    _refused(sock, tmp_path / "logs")
    assert sock.is_symlink()
    assert target.read_text() == "not the engine's"


def _socket_path_of_length(folder: Path, length: int) -> Path:
    """folder/<s...s>.sock, exactly `length` bytes long."""
    # Working: len(folder) + 1 for "/" + len(name) == length, with name = "s" * n + ".sock",
    # so n = length - len(folder) - 1 - 5.
    n = length - len(os.fsencode(folder)) - 1 - len(".sock")
    assert n > 0, f"{folder} is too long to build a {length}-byte path under it"
    path = folder / ("s" * n + ".sock")
    assert len(os.fsencode(path)) == length
    return path


def test_point_7_refuses_a_socket_path_over_103_bytes(run_dir: Path, tmp_path: Path) -> None:
    # "refuses a path over 103 bytes". 104 is the first length over. Fails if the engine binds
    # (or tries to bind and is cut short by the system) instead of refusing on the length.
    sock = _socket_path_of_length(run_dir, LONGEST_SOCKET_PATH + 1)
    _refused(sock, tmp_path)
    assert not os.path.lexists(sock)


def test_point_7_a_socket_path_of_exactly_103_bytes_is_served(
    run_dir: Path, tmp_path: Path
) -> None:
    # The other side of the same rule: 103 bytes is not over 103. Fails if the engine counts
    # the closing NUL into the limit, or refuses a path of the longest allowed length.
    sock = _socket_path_of_length(run_dir, LONGEST_SOCKET_PATH)
    with _engine(sock, tmp_path):
        assert stat.S_ISSOCK(sock.lstat().st_mode)


def test_point_7_a_stale_socket_of_this_user_is_replaced(run_dir: Path, tmp_path: Path) -> None:
    # "A stale socket file is removed first only if lstat shows a socket owned by this user."
    # A socket bound and closed leaves its file behind, as an engine that crashed does. Fails
    # if the engine refuses to start over it.
    sock = run_dir / "engine.sock"
    stale = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    stale.bind(str(sock))
    stale.close()
    assert stat.S_ISSOCK(sock.lstat().st_mode)
    with _engine(sock, tmp_path):
        assert stat.S_IMODE(sock.lstat().st_mode) == 0o600


def test_point_7_a_file_that_is_not_a_socket_is_left_alone(run_dir: Path, tmp_path: Path) -> None:
    # The same sentence: only a socket is removed. Fails if the engine deletes a plain file at
    # the socket path to bind there.
    sock = run_dir / "engine.sock"
    sock.write_text("a plain file")
    _refused(sock, tmp_path)
    assert sock.read_text() == "a plain file"


# Point 9: the token


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [("GET", "/health", None), ("GET", "/version", None), ("POST", "/v1/compute", H1B_CASE)],
)
def test_point_9_every_route_refuses_without_the_token_and_with_a_wrong_one(
    run_dir: Path, tmp_path: Path, method: str, path: str, body: Any
) -> None:
    # "Every route, /health included, requires the X-Duly-Local header." Wrong tokens: one of
    # the same length, one a byte short, and an empty one. Fails if a route answers any of
    # them, or does not answer the right one.
    wrong_same_length = secrets.token_hex(32)
    assert wrong_same_length != TOKEN
    with _engine(run_dir / "engine.sock", tmp_path) as engine:
        assert _request(engine.socket, method, path, token=None, body=body)[0] == 403
        for wrong in (wrong_same_length, TOKEN[:-1], ""):
            assert _request(engine.socket, method, path, token=wrong, body=body)[0] == 403
        assert _request(engine.socket, method, path, body=body)[0] == 200


def test_point_9_the_token_is_never_taken_from_the_environment(
    run_dir: Path, tmp_path: Path
) -> None:
    # "never travels in the environment or arguments". The engine is given one token on stdin
    # and another in DULY_LOCAL_TOKEN (the variable the server app reads, api/local_token.py).
    # Fails if the one from the environment is accepted.
    from_env = secrets.token_hex(32)
    env = _reduced_env(DULY_ENV="dev", DULY_LOCAL_TOKEN=from_env)
    with _engine(run_dir / "engine.sock", tmp_path, env=env) as engine:
        assert _request(engine.socket, "GET", "/version", token=from_env)[0] == 403
        assert _request(engine.socket, "GET", "/version")[0] == 200


def test_point_9_without_a_token_on_stdin_no_socket_is_made(run_dir: Path, tmp_path: Path) -> None:
    # "desktop_main reads it before binding": with stdin closed and empty there is no token,
    # and no route could be answered under point 9. Fails if the engine binds anyway.
    sock = run_dir / "engine.sock"
    _refused(sock, tmp_path, stdin=b"")
    assert not os.path.lexists(sock)


@pytest.mark.usefixtures("no_server_token")
def test_point_9_compute_over_the_socket_answers_as_the_server_app_does(
    run_dir: Path, tmp_path: Path
) -> None:
    # Point 10's other end: the request main sends over the socket reaches the shared route.
    # The h1b case's answer holds no date of today (cannot_tell, category_not_covered:h1b),
    # so the engine's own clock and the FixedClock agree on it. Fails if the route served
    # over the socket is not the one api.main serves.
    with _engine(run_dir / "engine.sock", tmp_path) as engine:
        status, content = _request(engine.socket, "POST", "/v1/compute", body=H1B_CASE)
    with _both_apps() as (server, _):
        expected = server.post("/v1/compute", json=H1B_CASE)
    assert status == 200
    out = json.loads(content)
    assert out["verdict"]["state"] == "cannot_tell"
    assert "category_not_covered:h1b" in out["verdict"]["reasons"]
    assert out["verdict"] == expected.json()["verdict"]


# Point 4: the mode


@pytest.mark.parametrize("duly_env", ["dev", "production"])
def test_point_4_packaged_refuses_any_environment_but_desktop(
    run_dir: Path, tmp_path: Path, duly_env: str
) -> None:
    # "In packaged mode it refuses to start when DULY_ENV is set to anything but desktop",
    # "exits non-zero with a plain line". A plain line: words on stderr, no traceback.
    # Fails if a packaged engine starts as dev, or refuses with a stack trace.
    sock = run_dir / "engine.sock"
    engine = _refused(sock, tmp_path, mode="packaged", env=_reduced_env(DULY_ENV=duly_env))
    assert not os.path.lexists(sock)
    said = engine.stderr.read_text(errors="replace").strip()
    assert said
    assert "Traceback" not in said
    assert TOKEN not in engine.output()


def test_point_4_packaged_with_desktop_starts(run_dir: Path, tmp_path: Path) -> None:
    # Electron's main passes DULY_ENV=desktop (point 16). Fails if packaged mode refuses it.
    env = _reduced_env(DULY_ENV="desktop")
    with _engine(run_dir / "engine.sock", tmp_path, mode="packaged", env=env) as engine:
        assert _request(engine.socket, "GET", "/version")[0] == 200


def test_point_4_repo_mode_allows_dev(run_dir: Path, tmp_path: Path) -> None:
    # "In repo mode (make desktop) dev is allowed." Fails if repo mode refuses dev.
    with _engine(run_dir / "engine.sock", tmp_path, env=_reduced_env(DULY_ENV="dev")) as engine:
        assert _request(engine.socket, "GET", "/health")[0] == 200


# Point 5: quiet logs


def test_point_5_no_request_path_or_body_is_written(run_dir: Path, tmp_path: Path) -> None:
    # "Uvicorn's access log is off and the log level is warning, so no request path or body is
    # written anywhere. The engine never logs a case." A canary goes in a free-text fact of
    # a case (a string scalar, case.schema.json $defs.scalar, at most 120 characters), in a
    # body that is not JSON, and in a path no route serves. Fails if any of them, or the
    # token, appears in what the engine wrote to stdout or stderr.
    canary = "canary" + secrets.token_hex(8)
    case = {**H1B_CASE, "facts": {"note": canary}}
    with _engine(run_dir / "engine.sock", tmp_path) as engine:
        _request(engine.socket, "POST", "/v1/compute", body=case)
        conn = _UnixConnection(engine.socket)
        try:
            not_json = b"{" + canary.encode()
            conn.request("POST", "/v1/compute", body=not_json, headers={HEADER: TOKEN})
            conn.getresponse().read()
        finally:
            conn.close()
        _request(engine.socket, "GET", "/" + canary)
        _request(engine.socket, "GET", "/v1/compute?" + canary)
    written = engine.output()
    assert canary not in written
    assert TOKEN not in written
    assert "/v1/compute" not in written


# In process: the same points, with api/desktop_main.py's functions called directly, so the
# lines the subprocess runs are measured too (plan-w1c). The subprocess tests above stay.


def test_point_4_check_mode_in_process() -> None:
    # "In packaged mode it refuses to start when DULY_ENV is set to anything but desktop ...
    # In repo mode dev is allowed." Unset counts as "anything but desktop". Fails if the check
    # is dropped, or if it refuses packaged with desktop or repo with dev.
    desktop_main = _desktop_main()
    for duly_env in ("dev", "production", None):
        with pytest.raises(desktop_main.RefusedError):
            desktop_main.check_mode("packaged", duly_env)
    desktop_main.check_mode("packaged", "desktop")
    desktop_main.check_mode("repo", "dev")


def test_point_9_the_token_is_the_first_line_of_stdin(monkeypatch: pytest.MonkeyPatch) -> None:
    # "It is written to the engine's stdin as the first line". The second line is not part of
    # it. Fails if the token is read from anywhere else, or takes more than the first line.
    monkeypatch.setattr(sys, "stdin", io.StringIO(TOKEN + "\nsecond line\n"))
    assert _desktop_main().read_token() == TOKEN


@pytest.mark.parametrize("stdin", ["", "\n", "   \n" + TOKEN + "\n"], ids=["empty", "blank", "sp"])
def test_point_9_no_token_on_the_first_line_is_refused(
    monkeypatch: pytest.MonkeyPatch, stdin: str
) -> None:
    # A closed empty stdin, or a first line with nothing in it, gives no token. Fails if the
    # engine goes on with an empty token (which no header could match under point 9), or reads
    # past the first line for one.
    monkeypatch.setattr(sys, "stdin", io.StringIO(stdin))
    with pytest.raises(_desktop_main().RefusedError):
        _desktop_main().read_token()


def test_point_7_bind_socket_in_process_makes_a_0600_socket(run_dir: Path) -> None:
    # "bind under umask 0o177, chmod 0o600, check with lstat", in a 0700 folder. Also the
    # umask is given back. Fails if the mode is not 0600, the file is not this user's socket,
    # or the process is left with umask 0o177.
    before = os.umask(0o022)
    os.umask(before)
    sock = _desktop_main().bind_socket(str(run_dir / "engine.sock"))
    try:
        st = (run_dir / "engine.sock").lstat()
        assert stat.S_ISSOCK(st.st_mode)
        assert stat.S_IMODE(st.st_mode) == 0o600
        assert st.st_uid == os.getuid()
        assert sock.family == socket.AF_UNIX
        now = os.umask(before)
        assert now == before
    finally:
        sock.close()


def test_point_7_bind_socket_in_process_replaces_a_stale_socket(run_dir: Path) -> None:
    # "A stale socket file is removed first only if lstat shows a socket owned by this user."
    # Fails if the engine refuses its own stale socket, or binds without removing it (EADDRINUSE).
    path = run_dir / "engine.sock"
    stale = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    stale.bind(str(path))
    stale.close()
    sock = _desktop_main().bind_socket(str(path))
    try:
        assert stat.S_ISSOCK(path.lstat().st_mode)
        assert stat.S_IMODE(path.lstat().st_mode) == 0o600
    finally:
        sock.close()


def test_point_7_bind_socket_in_process_refuses_what_lstat_does_not_show_as_0600(
    run_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # "check with lstat": a socket that did not end up 0600 (here chmod is made to give 0644)
    # is refused and closed. Fails if the engine trusts its chmod without looking.
    desktop_main = _desktop_main()
    real_chmod = os.chmod
    monkeypatch.setattr(desktop_main.os, "chmod", lambda path, _mode: real_chmod(path, 0o644))
    closed: list[socket.socket] = []
    real_close = socket.socket.close

    def close(self: socket.socket) -> None:
        closed.append(self)
        real_close(self)

    monkeypatch.setattr(socket.socket, "close", close)
    with pytest.raises(desktop_main.RefusedError):
        desktop_main.bind_socket(str(run_dir / "engine.sock"))
    assert len(closed) == 1


@pytest.mark.parametrize("mode", [0o720, 0o702], ids=["group-writable", "world-writable"])
def test_point_7_bind_socket_in_process_refuses_a_parent_others_can_write(
    run_dir: Path, mode: int
) -> None:
    # "refuses a parent that is group or world writable". Fails if bind_socket binds there.
    run_dir.chmod(mode)
    try:
        with pytest.raises(_desktop_main().RefusedError):
            _desktop_main().bind_socket(str(run_dir / "engine.sock"))
        assert not os.path.lexists(run_dir / "engine.sock")
    finally:
        run_dir.chmod(0o700)


def test_point_7_bind_socket_in_process_refuses_104_bytes(run_dir: Path) -> None:
    # "a path over 103 bytes": 104 is the first length over. Fails if the length rule goes.
    path = _socket_path_of_length(run_dir, LONGEST_SOCKET_PATH + 1)
    with pytest.raises(_desktop_main().RefusedError):
        _desktop_main().bind_socket(str(path))
    assert not os.path.lexists(path)


def test_point_7_bind_socket_in_process_leaves_a_symlink_and_a_file_alone(
    run_dir: Path, tmp_path: Path
) -> None:
    # "refuses a symlinked path"; only a socket of this user's is removed. Fails if
    # bind_socket follows or removes the link, or removes the plain file.
    target = tmp_path / "elsewhere"
    target.write_text("not the engine's")
    link = run_dir / "link.sock"
    link.symlink_to(target)
    plain = run_dir / "plain.sock"
    plain.write_text("a plain file")
    for path in (link, plain):
        with pytest.raises(_desktop_main().RefusedError):
            _desktop_main().bind_socket(str(path))
    assert link.is_symlink()
    assert target.read_text() == "not the engine's"
    assert plain.read_text() == "a plain file"


def test_point_4_main_in_process_refuses_packaged_dev_with_a_plain_line(
    run_dir: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    # "exits non-zero with a plain line", before the token is read and before any bind.
    # Fails if main starts, binds, or says nothing on stderr.
    monkeypatch.setenv("DULY_ENV", "dev")
    monkeypatch.setattr(sys, "stdin", io.StringIO(TOKEN + "\n"))
    path = run_dir / "engine.sock"
    code = _desktop_main().main(["--mode", "packaged", "--socket", str(path)])
    said = capsys.readouterr()
    assert code == 1
    assert said.err.strip()
    assert len(said.err.strip().splitlines()) == 1
    assert TOKEN not in said.out + said.err
    assert not os.path.lexists(path)


def test_point_9_main_in_process_makes_no_socket_without_a_token(
    run_dir: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    # "desktop_main reads it before binding". Fails if main binds with no token.
    monkeypatch.setenv("DULY_ENV", "dev")
    monkeypatch.setattr(sys, "stdin", io.StringIO(""))
    path = run_dir / "engine.sock"
    assert _desktop_main().main(["--mode", "repo", "--socket", str(path)]) == 1
    assert capsys.readouterr().err.strip()
    assert not os.path.lexists(path)


def test_point_4_run_as_a_module_exits_with_mains_code(
    run_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # `python -m api.desktop_main` (point 16) exits with what main returns: 1 for a packaged
    # engine under dev. run_path, so the file's own `__main__` block runs in this process.
    monkeypatch.setenv("DULY_ENV", "dev")
    monkeypatch.setattr(sys, "stdin", io.StringIO(TOKEN + "\n"))
    path = run_dir / "engine.sock"
    monkeypatch.setattr(
        sys, "argv", ["api.desktop_main", "--mode", "packaged", "--socket", str(path)]
    )
    with pytest.raises(SystemExit) as ended:
        runpy.run_path(str(REPO_ROOT / "api" / "desktop_main.py"), run_name="__main__")
    assert ended.value.code == 1
    assert not os.path.lexists(path)


@pytest.mark.usefixtures("no_server_token")
def test_points_5_7_9_main_in_process_serves_over_the_socket_with_the_token_only(
    run_dir: Path, monkeypatch: pytest.MonkeyPatch, capfd: pytest.CaptureFixture[str]
) -> None:
    # main as main starts it, in a thread: token on stdin, socket made 0600, the shared routes
    # served on it, every one refused without the token (point 9), and nothing about the
    # request written (point 5). uvicorn.Server is wrapped only to keep a handle to stop it.
    # Fails if main serves without the token, on another socket, at another mode, or logs the
    # request path.
    desktop_main = _desktop_main()
    servers: list[Any] = []
    real_server = desktop_main.uvicorn.Server

    class Kept(real_server):  # type: ignore[misc, valid-type]
        def __init__(self, config: Any) -> None:
            super().__init__(config)
            servers.append(self)

    monkeypatch.setattr(desktop_main.uvicorn, "Server", Kept)
    monkeypatch.setenv("DULY_ENV", "dev")
    monkeypatch.setattr(sys, "stdin", io.StringIO(TOKEN + "\n"))
    path = run_dir / "engine.sock"
    returned: list[int] = []
    thread = threading.Thread(
        target=lambda: returned.append(desktop_main.main(["--mode", "repo", "--socket", str(path)]))
    )
    thread.start()
    try:
        deadline = time.monotonic() + START_WITHIN
        while not _answers(path):
            assert thread.is_alive(), f"main ended with {returned}"
            assert time.monotonic() < deadline, "no health in time"
            time.sleep(0.05)
        assert stat.S_IMODE(path.lstat().st_mode) == 0o600
        assert _request(path, "GET", "/health", token=None)[0] == 403
        status, content = _request(path, "POST", "/v1/compute", token=None, body=H1B_CASE)
        assert status == 403
        assert json.loads(content) == {"detail": desktop_main.NOT_FROM_THE_APP}
        status, content = _request(path, "POST", "/v1/compute", body=H1B_CASE)
        assert status == 200
        assert json.loads(content)["verdict"]["state"] == "cannot_tell"
    finally:
        for server in servers:
            server.should_exit = True
        thread.join(timeout=15)
    assert not thread.is_alive()
    assert returned == [0]
    assert len(servers) == 1
    written = capfd.readouterr()
    assert "/v1/compute" not in written.out + written.err
    assert TOKEN not in written.out + written.err


# api/local_routes.py's refusals, through the desktop app in process (point 2: the same words as
# the server app, specs/path-1 RQ-A1).


@contextmanager
def _desktop_client() -> Iterator[CheckedClient]:
    desktop = _desktop_main().create_app(TOKEN)
    desktop.dependency_overrides[_local_routes().get_clock] = lambda: CLOCK
    yield CheckedClient(desktop, headers={HEADER: TOKEN})


@pytest.mark.parametrize(
    ("method", "path"), [("GET", "/health"), ("GET", "/version"), ("POST", "/v1/compute")]
)
def test_point_9_create_app_in_process_refuses_without_the_right_token(
    method: str, path: str
) -> None:
    # "Every route, /health included, requires the X-Duly-Local header", compared on bytes.
    # Wrong: none, a byte short, one outside ASCII. The refusal is 403 with NOT_FROM_THE_APP
    # (specs/desktop-1/SPEC.md). Fails if any route answers a wrong token, or a non-ASCII
    # header is an error and not a refusal.
    desktop_main = _desktop_main()
    client = CheckedClient(desktop_main.create_app(TOKEN))
    wrongs: list[dict[str, Any]] = [
        {},
        {HEADER: TOKEN[:-1]},
        {HEADER: TOKEN[:-1].encode() + b"\xe9"},
    ]
    for headers in wrongs:
        res = client.request(method, path, headers=headers, json=H1B_CASE)
        assert res.status_code == 403
        assert res.json() == {"detail": desktop_main.NOT_FROM_THE_APP}


def test_point_2_a_record_the_pack_does_not_declare_is_refused_without_its_words() -> None:
    # case.schema.json: a record whose kind the pack does not declare is refused; api/case.py
    # shows CASE_STRUCTURE (SPEC-W2-UNKNOWN point 39 retires NOT_IN_THE_PACK, point 54), not
    # the engine's words, which name what was sent. "vessel" is no
    # kind of the f1 pack (tests/unit/engine/test_path.py refuses the same kind). Fails if the
    # route answers 200, or a 500, or echoes the kind.
    from api.case import CASE_STRUCTURE

    body = {
        **H1B_CASE,
        "categories": ["f1"],
        "records": [{"id": "x1", "kind": "vessel", "fields": {}}],
    }
    with _desktop_client() as client:
        res = client.post("/v1/compute", json=body)
    assert res.status_code == 422
    assert res.json() == {"detail": CASE_STRUCTURE}
    assert "vessel" not in res.text


def test_point_2_the_shared_route_refuses_in_the_words_of_compute_f1() -> None:
    # The same refusals as /v1/compute/f1 (RQ-A1). A body that is not JSON, one with NaN, one
    # outside case.schema.json (no category: minItems 1), and an answer dated 2026-09-30, the
    # day after CLOCK's 2026-09-29 in UTC (16:00 UTC on 2026-09-29). Fails if any is
    # answered, or refused in other words.
    from api.case_f1 import NOT_A_NUMBER, NOT_JSON, NOT_YET

    headers = {"content-type": "application/json"}
    nan = json.dumps(H1B_CASE).replace('"facts": {}', '"facts": {"x": NaN}')
    after = {
        **H1B_CASE,
        "confirmations": {"record.ends_before_today": {"answer": True, "on": "2026-09-30"}},
    }
    with _desktop_client() as client:
        not_json = client.post("/v1/compute", content=b"{not json", headers=headers)
        not_a_number = client.post("/v1/compute", content=nan, headers=headers)
        no_category = client.post("/v1/compute", json={**H1B_CASE, "categories": []})
        not_yet = client.post("/v1/compute", json=after)
    assert (not_json.status_code, not_json.json()["detail"]) == (422, NOT_JSON)
    assert (not_a_number.status_code, not_a_number.json()["detail"]) == (422, NOT_A_NUMBER)
    assert no_category.status_code == 422
    assert isinstance(no_category.json()["detail"], str)
    assert no_category.json()["detail"].strip()
    assert (not_yet.status_code, not_yet.json()["detail"]) == (422, NOT_YET)
