#!/usr/bin/env python3
"""PreToolUse on Bash. Lanes do not install software or touch another lane's containers."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _lane import block, lane_name, read_event

event = read_event()
command = (event.get("tool_input") or {}).get("command", "")
name = lane_name()
if not command or name == "founder":
    sys.exit(0)

INSTALLS = re.compile(
    r"\b(?:pip3?\s+install|uv\s+(?:add|pip\s+install)|npm\s+(?:install|i|add)\s+\S|pnpm\s+add|"
    r"yarn\s+add|brew\s+install|cargo\s+install|go\s+install)\b|\b(?:curl|wget)\b[^|;]*\|\s*(?:ba|z)?sh\b"
)
if INSTALLS.search(command):
    block("Lanes do not add dependencies. Write the request in your progress log and stop.")

own = f"duly-{name.lower()}"
# Only docker compose takes a project name. Other tools use -p for other things.
for call in re.findall(r"\bdocker[ -]compose\b[^|;&]*", command):
    for project in re.findall(r"(?:-p|--project-name)[ =](\S+)", call):
        if project != own:
            block(f"Lane {name} may only use the compose project {own}.")
if re.search(r"\bdocker\s+(?:system\s+prune|volume\s+rm|rm\s+-f|kill)\b", command):
    block("Lanes do not remove containers or volumes by hand. Use make down.")
if re.search(r"\bgit\s+(?:push|reset\s+--hard|clean)\b|--no-verify", command):
    block("Lanes do not push, hard reset, or skip checks.")
