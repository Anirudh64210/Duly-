#!/usr/bin/env python3
"""PostToolUse on Write and Edit. Lint and type check the file that was just touched."""

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _lane import block, project_root, read_event

event = read_event()
target = (event.get("tool_input") or {}).get("file_path", "")
root = project_root()
path = Path(target)
if not target or not path.exists():
    sys.exit(0)

commands: list[list[str]] = []
if path.suffix == ".py":
    commands = [
        ["uv", "run", "ruff", "check", target],
        ["uv", "run", "ruff", "format", "--check", target],
        ["uv", "run", "mypy", "--follow-imports=silent", target],
    ]
elif path.suffix in {".ts", ".tsx"}:
    commands = [["npx", "eslint", "--max-warnings", "0", target]]

for command in commands:
    done = subprocess.run(command, cwd=root, capture_output=True, text=True, check=False)
    if done.returncode:
        block((done.stdout + done.stderr)[-2000:])
