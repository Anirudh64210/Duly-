#!/usr/bin/env python3
"""Stop. A lane's turn cannot end while its own tests fail."""

import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from _lane import block, lane_name, project_root, read_event

from tools.diff_policy.check import LaneError, load_lane

event = read_event()
name = lane_name()
if name == "founder" or event.get("stop_hook_active"):
    sys.exit(0)

root = project_root()
try:
    lane = load_lane(name, root)
except LaneError as err:
    block(str(err))
# A round can set its own finish line. When tests are written before the code they
# test, the lane's usual test cannot pass yet, and the round's done command is the target.
target = os.environ.get("DULY_DONE", "").strip() or lane.test
if not target:
    sys.exit(0)

# The target may join commands with && or pipes, so it goes through a shell.
done = subprocess.run(["bash", "-c", target], cwd=root, capture_output=True, text=True, check=False)
if done.returncode:
    block(f"Lane test failed: {target}\n" + (done.stdout + done.stderr)[-2500:])
