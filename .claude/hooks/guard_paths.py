#!/usr/bin/env python3
"""PreToolUse on Write and Edit. A lane may only touch the paths it owns."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from _lane import block, lane_name, project_root, read_event

from tools.diff_policy.check import LaneError, load_lane, violations

event = read_event()
target = (event.get("tool_input") or {}).get("file_path", "")
name = lane_name()
if not target or name == "founder":
    sys.exit(0)

root = project_root()
try:
    rel = Path(target).resolve().relative_to(root).as_posix()
except ValueError:
    block(f"Lane {name} may not write outside the repo: {target}")

try:
    lane = load_lane(name, root)
except LaneError as err:
    block(str(err))

if violations(lane, [rel]):
    block(
        f"Lane {name} does not own {rel}. The gates are the spec; passing by going around "
        "them is task failure. If this file must change, write the request in your progress "
        "log and stop."
    )
