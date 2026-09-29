"""Run one lane: its own worktree, its own Claude session, fresh context each iteration.

The session starts inside the worktree, so the repo's hooks load and the lane
guards apply. Everything the agent does is copied to the factory event log.

Usage:
  uv run python -m tools.factory.run_lane --lane L-engine --spec specs/phase-2/SPEC.md \\
      --mission "Build engine/f1.py" --done "uv run pytest tests/unit/engine -q" --base phase-2
"""

import argparse
import json
import os
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Any

from tools.diff_policy.check import load_lane
from tools.factory.log import append

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS = ["Read", "Edit", "Write", "Glob", "Grep", "Bash"]
READ_ONLY_TOOLS = ["Read", "Glob", "Grep", "Bash"]

PROMPT = """# Mission

{mission}

You are the agent for lane {lane}. You work only in this worktree.

# Read first, in this order

1. {progress} if it exists. It is your memory between iterations.
2. {spec}
3. CLAUDE.md, BOUNDARY.md, DECISIONS.md
4. Any skill in .claude/skills/ whose description matches the work.

# You own

{owned}

You may not change anything else. A guard blocks writes outside these paths, and the
merge gate rejects them. The gates are the spec. Passing by going around them is task
failure. If a file you do not own must change, write the request in {progress} and
carry on with what you can do.

# Done when this passes

```
{done}
```

# How to work

- Small steps. Run the done command often.
- Commit your work on this branch with conventional commit messages. Never push.
- Append to {progress} as you go: what you tried, what ran, what it printed.
- Do not add dependencies. Do not read tests/holdout/.
- If the same failure appears twice and you cannot see why, write {escalate} with what
  you tried and the failure tail, then stop.
- When you learn something a future agent would need, add it at the end of {progress}
  under the heading "Lesson", with: failure, fix, evidence. The curator collects these.
"""


def _run(cmd: list[str], cwd: Path, env: dict[str, str] | None = None) -> tuple[int, str]:
    done = subprocess.run(cmd, cwd=cwd, env=env, check=False, capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


def ensure_worktree(lane: str, base: str, slug: str) -> Path:
    path = REPO_ROOT.parent / f"duly-{lane}"
    branch = f"lane/{lane}/{slug}"
    if not path.exists():
        code, out = _run(["git", "worktree", "add", "-B", branch, str(path), base], REPO_ROOT)
        if code:
            raise RuntimeError(out)
    (path / ".lane").write_text(lane + "\n")
    modules = path / "node_modules"
    if not modules.exists():
        modules.symlink_to(REPO_ROOT / "node_modules")
    return path


def _summary(name: str, tool_input: dict[str, Any], root: Path) -> str:
    if name in {"Read", "Edit", "Write"}:
        target = str(tool_input.get("file_path", ""))
        rel = target.replace(str(root) + "/", "")
        verb = {"Read": "reads", "Edit": "edits", "Write": "writes"}[name]
        return f"{verb} {rel}"
    if name == "Bash":
        return "runs " + " ".join(str(tool_input.get("command", "")).split())[:160]
    if name in {"Glob", "Grep"}:
        return f"searches for {tool_input.get('pattern', '')}"
    return name


def iterate(
    lane: str,
    agent: str,
    prompt: str,
    root: Path,
    tools: list[str],
    max_turns: int,
    model: str,
    done: str = "",
) -> int:
    cmd = [
        "claude",
        "-p",
        prompt,
        "--output-format",
        "stream-json",
        "--verbose",
        "--permission-mode",
        "acceptEdits",
        "--max-turns",
        str(max_turns),
        "--allowed-tools",
        *tools,
    ]
    if model:
        cmd += ["--model", model]
    env = dict(os.environ)
    env["DULY_LANE"] = lane
    env["DULY_DONE"] = done
    env["UV_PROJECT_ENVIRONMENT"] = str(REPO_ROOT / ".venv")
    env.pop("CLAUDECODE", None)
    with subprocess.Popen(
        cmd, cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    ) as proc:
        assert proc.stdout is not None
        for line in proc.stdout:
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            kind = event.get("type")
            if kind == "assistant":
                for block in event.get("message", {}).get("content", []):
                    if block.get("type") == "tool_use":
                        text = _summary(block.get("name", ""), block.get("input", {}), root)
                        step = "test" if "pytest" in text or "npm test" in text else "step"
                        append(lane, agent, step, text, REPO_ROOT)
            elif kind == "result":
                cost = event.get("total_cost_usd")
                turns = event.get("num_turns")
                note = f"iteration ended after {turns} turns"
                if cost is not None:
                    note += f", {cost:.2f} USD"
                append(lane, agent, "step", note, REPO_ROOT)
        return proc.wait()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", required=True)
    parser.add_argument("--agent", default="builder")
    parser.add_argument("--spec", required=True)
    parser.add_argument("--mission", required=True)
    parser.add_argument("--done", required=True)
    parser.add_argument("--base", default="main")
    parser.add_argument("--slug", default="work")
    parser.add_argument("--max-iterations", type=int, default=6)
    parser.add_argument("--max-turns", type=int, default=80)
    parser.add_argument("--model", default="")
    parser.add_argument("--read-only", action="store_true")
    args = parser.parse_args()
    if args.max_iterations > 50:
        print("cap is 50 iterations")
        return 1

    lane = load_lane(args.lane, REPO_ROOT)
    root = ensure_worktree(args.lane, args.base, args.slug)
    home = next((p[:-3] for p in lane.owned if p.endswith("/**")), ".")
    progress = f"{home}/PROGRESS.md"
    escalate = f"{home}/ESCALATE.md"
    prompt = PROMPT.format(
        mission=args.mission,
        lane=args.lane,
        spec=args.spec,
        progress=progress,
        escalate=escalate,
        done=args.done,
        owned="\n".join(f"- {p}" for p in lane.owned),
    )
    env = dict(os.environ)
    env["UV_PROJECT_ENVIRONMENT"] = str(REPO_ROOT / ".venv")
    tools = READ_ONLY_TOOLS if args.read_only else TOOLS

    append(args.lane, args.agent, "start", args.mission, REPO_ROOT)
    for i in range(1, args.max_iterations + 1):
        if (root / escalate).exists():
            append(args.lane, args.agent, "blocked", f"escalated: see {escalate}", REPO_ROOT)
            return 2
        code, _ = _run(shlex.split(args.done), root, env)
        if code == 0 and i > 1:
            break
        append(args.lane, args.agent, "step", f"iteration {i} of {args.max_iterations}", REPO_ROOT)
        iterate(args.lane, args.agent, prompt, root, tools, args.max_turns, args.model, args.done)

    code, out = _run(shlex.split(args.done), root, env)
    if code == 0:
        append(args.lane, args.agent, "done", f"done: {args.done}", REPO_ROOT)
        return 0
    append(
        args.lane,
        args.agent,
        "failed",
        "cap reached; done command still fails: " + out.strip().splitlines()[-1][:200]
        if out.strip()
        else "cap reached",
        REPO_ROOT,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
