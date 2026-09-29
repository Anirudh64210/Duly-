"""The factory dashboard. Local only, read only.

Usage: make factory, then open http://localhost:5175
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from tools.factory.state import snapshot

REPO_ROOT = Path(__file__).resolve().parents[2]
PAGE = Path(__file__).resolve().parent / "page.html"
HOST = "127.0.0.1"
PORT = 5175


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, kind: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/state.json":
            body = json.dumps(snapshot(REPO_ROOT)).encode()
            self._send(200, "application/json", body)
        elif self.path in {"/", "/index.html"}:
            self._send(200, "text/html; charset=utf-8", PAGE.read_bytes())
        else:
            self._send(404, "text/plain", b"not found")

    def log_message(self, format: str, *args: object) -> None:
        return


def main() -> int:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"factory dashboard: http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
