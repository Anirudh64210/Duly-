"""The desktop engine: the shared local routes, served over a Unix socket only Duly can open.

specs/step-w/SPEC-W1.md points 1 to 5, 7 and 9. Started by the desktop app's main as
`python -m api.desktop_main --mode packaged|repo --socket <path>`, with the launch token as
the first line of stdin. Reads no api.settings: nothing server-only is loaded.
"""

import argparse
import hmac
import os
import socket
import stat
import sys
from collections.abc import Awaitable, Callable

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from api.local_routes import API_VERSION, router
from api.local_token import NOT_FROM_THE_APP, TOKEN_HEADER

# macOS: sun_path is 104 bytes with its closing NUL, so 103 bytes is the longest path.
LONGEST_SOCKET_PATH = 103


class RefusedError(Exception):
    """A reason not to start, said in one plain line."""


def create_app(token: str) -> FastAPI:
    """The three local routes. Every one, /health included, requires the launch token."""
    app = FastAPI(
        title="Duly engine",
        version=API_VERSION,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    expected = token.encode("utf-8")

    @app.middleware("http")
    async def token_guard(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        sent = request.headers.get(TOKEN_HEADER)
        # Constant time, on bytes, so a header outside ASCII is refused and not an error.
        if sent is None or not hmac.compare_digest(sent.encode("utf-8"), expected):
            return JSONResponse(status_code=403, content={"detail": NOT_FROM_THE_APP})
        return await call_next(request)

    app.include_router(router)
    return app


def check_mode(mode: str, duly_env: str | None) -> None:
    """Point 4: a packaged engine runs only as desktop. Repo mode allows dev."""
    if mode == "packaged" and duly_env != "desktop":
        raise RefusedError("A packaged Duly engine starts only with DULY_ENV=desktop.")


def read_token() -> str:
    """Point 9: the first line of stdin, never argv or the environment."""
    token = sys.stdin.readline().strip()
    if not token:
        raise RefusedError("No launch token was given on stdin, so the engine did not start.")
    return token


def bind_socket(path: str) -> socket.socket:
    """Point 7: the engine makes its own socket, this user's, mode 0600."""
    if len(os.fsencode(path)) > LONGEST_SOCKET_PATH:
        raise RefusedError(f"The socket path is longer than {LONGEST_SOCKET_PATH} bytes.")
    uid = os.getuid()
    parent = os.stat(os.path.dirname(os.path.abspath(path)))
    if parent.st_uid != uid or parent.st_mode & 0o022:
        raise RefusedError("The socket folder is not this user's alone.")
    try:
        existing = os.lstat(path)
    except FileNotFoundError:
        pass
    else:
        if not stat.S_ISSOCK(existing.st_mode) or existing.st_uid != uid:
            raise RefusedError("Something that is not this user's socket is at the socket path.")
        os.unlink(path)
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    old_umask = os.umask(0o177)
    try:
        sock.bind(path)
    finally:
        os.umask(old_umask)
    os.chmod(path, 0o600)
    made = os.lstat(path)
    if not stat.S_ISSOCK(made.st_mode) or made.st_uid != uid or stat.S_IMODE(made.st_mode) != 0o600:
        sock.close()
        raise RefusedError("The socket was not made as this user's alone.")
    return sock


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="api.desktop_main")
    parser.add_argument("--mode", choices=("packaged", "repo"), required=True)
    parser.add_argument("--socket", required=True)
    args = parser.parse_args(argv)
    try:
        check_mode(args.mode, os.environ.get("DULY_ENV"))
        token = read_token()
        sock = bind_socket(args.socket)
    except (RefusedError, OSError) as refused:
        print(refused, file=sys.stderr)
        return 1
    # Point 5: no access log and warning level, so no request path or body is written.
    config = uvicorn.Config(create_app(token), log_level="warning", access_log=False)
    uvicorn.Server(config).run(sockets=[sock])
    return 0


if __name__ == "__main__":
    sys.exit(main())
