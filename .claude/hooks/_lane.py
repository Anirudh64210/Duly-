"""Shared by the hooks. No lane file means the founder is at the keyboard."""

import json
import os
import sys
from pathlib import Path
from typing import Any


def project_root() -> Path:
    return Path(os.environ.get("CLAUDE_PROJECT_DIR", Path.cwd())).resolve()


def lane_name() -> str:
    env = os.environ.get("DULY_LANE", "").strip()
    if env:
        return env
    marker = project_root() / ".lane"
    return marker.read_text().strip() if marker.exists() else "founder"


def read_event() -> dict[str, Any]:
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError:
        return {}


def block(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(2)
