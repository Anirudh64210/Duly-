"""The slim desktop engine entrypoint, api/desktop_main.py, and its socket.

specs/step-w/SPEC-W1.md sections 1 and 2 (points 1 to 5, 7 and 9; points 6, 8, 10 and 11 are
main's side and are checked in desktop/src):

- Point 1: the app has exactly three routes, GET /health, GET /version and POST /v1/compute,
  with the shapes of openapi.yaml. Not /v1/compute/f1, /v1/status or /ops/*.
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
import json
import os
import secrets
import socket
import stat
import subprocess
import sys
import tempfile
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any

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


def test_point_1_the_app_has_exactly_the_three_routes() -> None:
    # Fails on any other route: /v1/compute/f1, /v1/status, /ops/*, and FastAPI's own
    # /openapi.json, /docs and /redoc, which an app serves unless they are turned off.
    app: FastAPI = _desktop_main().create_app(TOKEN)
    served = _served(app.routes)
    assert sorted((path, sorted(methods)) for path, methods, _ in served) == [
        ("/health", ["GET"]),
        ("/v1/compute", ["POST"]),
        ("/version", ["GET"]),
    ]
    assert all(endpoint is not None for _, _, endpoint in served)


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
    keys = {local_routes.get_clock, api.main.get_clock}
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
