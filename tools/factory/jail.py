"""Run a command the factory did not write, such as an agent's tests, inside walls.

The orchestrator never trusts a result an agent reports. It runs the checks itself. But
the checks execute code an agent wrote, so they run with no network, no sight of the
person's keys, and no way to write outside the folder under test.

macOS: sandbox-exec (seatbelt). Linux: bubblewrap. Anything else: refuse.
"""

import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from tools.factory.sandbox import SECRETS


class JailError(RuntimeError):
    pass


@dataclass(frozen=True)
class Result:
    code: int
    output: str
    timed_out: bool


def _quote(path: str) -> str:
    return '"' + path.replace("\\", "\\\\").replace('"', '\\"') + '"'


def seatbelt_profile(writable: list[Path], unreadable: list[str]) -> str:
    lines = [
        "(version 1)",
        "(allow default)",
        "(deny network*)",
        '(allow network-outbound (remote ip "localhost:*"))',
        '(allow network-inbound (local ip "localhost:*"))',
        '(allow network-bind (local ip "localhost:*"))',
        "(deny file-write*)",
        '(allow file-write* (literal "/dev/null") (literal "/dev/stdout") (literal "/dev/stderr")'
        ' (literal "/dev/tty") (literal "/dev/dtracehelper") (regex #"^/dev/fd/"))',
    ]
    for path in writable:
        real = os.path.realpath(path)
        lines.append(f"(allow file-write* (subpath {_quote(real)}))")
    for item in unreadable:
        real = os.path.realpath(os.path.expanduser(item))
        lines.append(f"(deny file-read* (subpath {_quote(real)}))")
        lines.append(f"(deny file-write* (subpath {_quote(real)}))")
    return "\n".join(lines) + "\n"


def available() -> bool:
    if sys.platform == "darwin":
        return shutil.which("sandbox-exec") is not None
    return shutil.which("bwrap") is not None


def run(
    command: str,
    cwd: Path,
    env: dict[str, str],
    timeout_seconds: int = 900,
    extra_writable: list[Path] | None = None,
    extra_unreadable: list[str] | None = None,
) -> Result:
    if not available():
        raise JailError("no sandbox on this machine; the factory will not run unchecked code")
    scratch = Path(tempfile.mkdtemp(prefix="duly-jail-"))
    writable = [cwd, scratch, *(extra_writable or [])]
    unreadable = [*SECRETS, *(extra_unreadable or [])]
    jail_env = {**env, "TMPDIR": str(scratch), "HOME": env.get("HOME", str(Path.home()))}
    if sys.platform == "darwin":
        profile = scratch / "profile.sb"
        profile.write_text(seatbelt_profile(writable, unreadable))
        argv = ["sandbox-exec", "-f", str(profile), "bash", "-c", command]
    else:
        argv = [
            "bwrap",
            "--ro-bind",
            "/",
            "/",
            "--dev",
            "/dev",
            "--proc",
            "/proc",
            "--unshare-net",
            "--die-with-parent",
        ]
        for path in writable:
            if path.exists():  # a bind needs its source; a missing folder has nothing to guard
                argv += ["--bind", str(path), str(path)]
        for item in unreadable:
            real = os.path.realpath(os.path.expanduser(item))
            if os.path.isdir(real):
                argv += ["--tmpfs", real]
        argv += ["bash", "-c", command]
    try:
        done = subprocess.run(
            argv,
            cwd=cwd,
            env=jail_env,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        return Result(done.returncode, done.stdout + done.stderr, False)
    except subprocess.TimeoutExpired as late:
        out = (late.stdout or b"") + (late.stderr or b"")
        text = out.decode("utf-8", errors="replace") if isinstance(out, bytes) else str(out)
        return Result(124, text + f"\nstopped after {timeout_seconds} seconds", True)
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
