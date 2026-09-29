"""Who is working on what. One claim per lane and one per task, under a lock.

Also the kill switch: while the STOP file exists nothing may start.
"""

import fcntl
import json
import os
import signal
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from engine.clocks import SystemClock
from tools.factory.paths import state_dir


class ClaimError(RuntimeError):
    pass


class StoppedError(RuntimeError):
    pass


def _file(cwd: Path | None) -> Path:
    return state_dir(cwd) / "registry.json"


def stop_file(cwd: Path | None = None) -> Path:
    return state_dir(cwd) / "STOP"


def stopped(cwd: Path | None = None) -> bool:
    return stop_file(cwd).exists()


@contextmanager
def _locked(cwd: Path | None) -> Iterator[dict[str, Any]]:
    with (state_dir(cwd) / "registry.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = _file(cwd)
        try:
            data: dict[str, Any] = json.loads(path.read_text()) if path.exists() else {}
        except json.JSONDecodeError:
            data = {}
        data.setdefault("runs", {})
        yield data
        path.write_text(json.dumps(data, indent=2))


def alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def claim(
    run_id: str,
    lane: str,
    task: str,
    worktree: str,
    base_commit: str,
    agent: str,
    cwd: Path | None = None,
    pid: int | None = None,
) -> dict[str, Any]:
    if stopped(cwd):
        raise StoppedError("the factory is stopped. Run make resume to start it again.")
    with _locked(cwd) as data:
        for other_id, other in list(data["runs"].items()):
            if not alive(int(other.get("pid", 0))):
                del data["runs"][other_id]  # its process is gone; the claim is stale
                continue
            if other["lane"] == lane:
                raise ClaimError(f"lane {lane} is already claimed by run {other_id}")
            if other["task"] == task:
                raise ClaimError(f"task {task} is already claimed by run {other_id}")
        entry = {
            "lane": lane,
            "task": task,
            "agent": agent,
            "worktree": worktree,
            "base_commit": base_commit,
            "pid": pid or os.getpid(),
            "started_at": SystemClock().now().isoformat(timespec="seconds"),
        }
        data["runs"][run_id] = entry
        return entry


def set_pid(run_id: str, pid: int, cwd: Path | None = None) -> None:
    with _locked(cwd) as data:
        if run_id in data["runs"]:
            data["runs"][run_id]["agent_pid"] = pid


def release(run_id: str, cwd: Path | None = None) -> None:
    with _locked(cwd) as data:
        data["runs"].pop(run_id, None)


def active(cwd: Path | None = None) -> dict[str, Any]:
    with _locked(cwd) as data:
        for run_id, run in list(data["runs"].items()):
            if not alive(int(run.get("pid", 0))):
                del data["runs"][run_id]
        return dict(data["runs"])


def stop_all(reason: str, cwd: Path | None = None) -> list[str]:
    """The kill switch. Nothing new starts, and every running agent is ended.

    Worktrees are left exactly as they are, so nothing is lost and nothing half
    finished is merged.
    """
    stop_file(cwd).write_text(
        json.dumps({"at": SystemClock().now().isoformat(timespec="seconds"), "reason": reason})
    )
    ended = []
    for run_id, run in active(cwd).items():
        for key in ("agent_pid", "pid"):
            pid = int(run.get(key, 0))
            if pid > 0 and pid != os.getpid() and alive(pid):
                try:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                except (ProcessLookupError, PermissionError):
                    try:
                        os.kill(pid, signal.SIGTERM)
                    except (ProcessLookupError, PermissionError):
                        continue
        ended.append(run_id)
    return ended


def resume(cwd: Path | None = None) -> bool:
    path = stop_file(cwd)
    if path.exists():
        path.unlink()
        return True
    return False
