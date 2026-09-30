"""Tell the founder when something needs them. Every alert is also a line in the ledger."""

import os
import subprocess
import sys
from pathlib import Path

from tools.factory import ledger
from tools.factory.config import load_config
from tools.factory.paths import main_repo

KINDS = (
    "guardrail",
    "budget",
    "stall",
    "loop",
    "retry_storm",
    "eval_drop",
    "veto",
    "tamper",
    "failed",
    "escalated",
    "stopped",
    "model",
)


def notify(
    kind: str, message: str, lane: str = "founder", run_id: str = "", cwd: Path | None = None
) -> None:
    if kind not in KINDS:
        raise ValueError(f"unknown alert {kind}")
    ledger.append(
        lane, "orchestrator", "alert", f"{kind}: {message}", cwd, run_id=run_id, alert=kind
    )
    if os.environ.get("DULY_NO_NOTIFY") or sys.platform != "darwin":
        return
    try:
        if load_config(main_repo(cwd))["alerts"]["notify"] != "macos":
            return
    except (OSError, KeyError, ValueError):
        return
    text = message.replace('"', "'")[:180]
    subprocess.run(
        ["osascript", "-e", f'display notification "{text}" with title "Factory: {kind}"'],
        check=False,
        capture_output=True,
        timeout=5,
    )
