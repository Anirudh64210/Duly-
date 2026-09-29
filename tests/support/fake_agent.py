#!/usr/bin/env python3
"""A stand-in for the agent binary, for testing the factory without a model.

It plays a scenario: a list of attempts, each a list of steps. The scenario file is named
by FAKE_AGENT_SCENARIO. It is not sandboxed, so it can also play an agent that misbehaves.

Steps: {"init": model} {"tool": name, "input": {...}, "times": n} {"write": path, "text": t}
       {"report": home, "status": s, "files": [...]} {"raw": text} {"sleep": seconds}
       {"git": [args]} {"result": {"cost": c, "turns": n}} {"exit": code}
       {"usage": {"in": n, "out": n}}
"""

import json
import os
import subprocess
import sys
import time
from pathlib import Path

scenario_file = Path(os.environ["FAKE_AGENT_SCENARIO"])
scenario = json.loads(scenario_file.read_text())
counter = scenario_file.with_suffix(".count")
attempt = int(counter.read_text()) if counter.exists() else 0
counter.write_text(str(attempt + 1))
steps = scenario["attempts"][min(attempt, len(scenario["attempts"]) - 1)]
session = f"fake-session-{attempt + 1}"
message = 0


def emit(event):
    print(json.dumps(event), flush=True)


for step in steps:
    if "init" in step:
        emit({"type": "system", "subtype": "init", "session_id": session, "model": step["init"]})
    elif "tool" in step:
        for _ in range(step.get("times", 1)):
            message += 1
            emit(
                {
                    "type": "assistant",
                    "message": {
                        "id": f"m{message}",
                        "content": [
                            {
                                "type": "tool_use",
                                "name": step["tool"],
                                "input": step.get("input", {}),
                            }
                        ],
                    },
                }
            )
    elif "usage" in step:
        message += 1
        emit(
            {
                "type": "assistant",
                "message": {
                    "id": f"m{message}",
                    "content": [],
                    "usage": {
                        "input_tokens": step["usage"]["in"],
                        "output_tokens": step["usage"]["out"],
                    },
                },
            }
        )
    elif "write" in step:
        path = Path(step["write"])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(step.get("text", "x\n"))
    elif "report" in step:
        path = Path(step["report"]) / "REPORT.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        body = step.get("body") or {
            "run_id": os.environ["DULY_RUN_ID"],
            "status": step.get("status", "done"),
            "summary": step.get("summary", "Did the work the mission asked for."),
            "commands_run": [],
            "files_changed": step.get("files", []),
            "lessons": step.get("lessons", []),
            "disputes": [],
            "requests": [],
        }
        path.write_text(body if isinstance(body, str) else json.dumps(body))
    elif "raw" in step:
        print(step["raw"], flush=True)
    elif "sleep" in step:
        time.sleep(step["sleep"])
    elif "git" in step:
        subprocess.run(["git", *step["git"]], check=False, capture_output=True)
    elif "result" in step:
        emit(
            {
                "type": "result",
                "session_id": session,
                "is_error": False,
                "total_cost_usd": step["result"].get("cost", 0.1),
                "num_turns": step["result"].get("turns", 3),
            }
        )
    elif "exit" in step:
        sys.exit(step["exit"])
