"""Preflight. A plan is checked against the repository before any agent runs.

Product-2 stopped five times in one hour, and three of the stops were the plan's own faults,
found only when an agent escalated: a lane told to write outside the paths it owns, a lane held
by its done command to a file only another lane could make, and a mission naming a resolution
point that did not exist yet. Each costs a full agent attempt. These are all visible in the plan
and the repository, so they are checked here, in seconds, before the first round starts.

Usage: python -m tools.factory.preflight specs/<phase>/plan.yaml
"""

import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

from tools.diff_policy.check import LaneError, load_lane, matches
from tools.factory.config import ConfigError, all_contracts
from tools.factory.paths import REPO_ROOT
from tools.factory.phase import PlanError, load_plan, working_branch

PATH = r"`?((?:[\w.-]+/)+[\w.-]+\.[A-Za-z]{1,5})`?"
WRITE = re.compile(
    r"\b(?:write|writes|create|creates|edit|edits|update|updates|change|changes|remove|removes"
    r"|delete)\s+" + PATH,
    re.I,
)
# The file as the subject of its change ("desktop/python/bundle.json gains ..."), or the target
# of an addition ("add X to api/case.py"). plan-w2-p3-fix0 gave L-api a bundle.json that "gains"
# three entries; no verb above caught it, and the lane spent three attempts before escalating.
CHANGED = re.compile(PATH + r"\s+(?:gains?|loses?|becomes?)\b", re.I)
ADDED_TO = re.compile(r"\badds?\b[^.;:]{1,80}?\s(?:to|into)\s+" + PATH, re.I)
COPY = re.compile(r"\b(copy|move|mv|cp)\s+" + PATH + r"\s+(?:to|into)\s+" + PATH, re.I)
DONE_PATH = re.compile(
    r"(?<![\w/.-])((?:[\w-]+/)+[\w.-]+\.(?:py|ts|tsx|js|json|yaml|md|txt))(?![\w/])"
)
POINT = re.compile(r"\bpoints?\s+(\d+[a-z]?)(?:\s*(?:to|and|,)\s*(\d+[a-z]?))?", re.I)
BRANCH = re.compile(r"\b(lane/[\w-]+/[\w-]+)")
# A mission that is only one command ("run make samples, change nothing else") needs no agent.
TOOL = r"(?:make|uv|npm|npx|pnpm|python3?|pytest|node|bash|sh)"
COMMAND = r"(?:`[^`\n]+`|" + TOOL + r"\b(?:[ \t]+(?!and\b|then\b)[^\s,;`]+)*)"
ONE_COMMAND = re.compile(
    r"^\s*run\s+" + COMMAND + r"\s*(?:[,.;:]?\s*(?:and\s+)?(?:change|do|touch|edit)\s+nothing"
    r"\s+else)?\s*[.!]?\s*$",
    re.I,
)


def _writes(mission: str) -> list[str]:
    out = [m.group(1) for m in WRITE.finditer(mission)]
    out += [m.group(1) for m in CHANGED.finditer(mission)]
    out += [m.group(1) for m in ADDED_TO.finditer(mission)]
    for m in COPY.finditer(mission):
        out.append(m.group(3))
        if m.group(1).lower() in {"move", "mv"}:
            out.append(m.group(2))
    return out


def _points(spec: str) -> set[str]:
    return set(re.findall(r"^(?:##\s+)?(\d+[a-z]?)\.\s", spec, re.M))


def _numbers(a: str, b: str | None) -> list[str]:
    if b is None or not (a.isdigit() and b.isdigit()):
        return [a] + ([b] if b else [])
    return [str(n) for n in range(int(a), int(b) + 1)]


def _exists_at(repo: Path, ref: str, path: str) -> bool:
    done = subprocess.run(
        ["git", "cat-file", "-e", f"{ref}:{path}"], cwd=repo, capture_output=True, check=False
    )
    return done.returncode == 0


def _branch_exists(repo: Path, name: str) -> bool:
    done = subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", name],
        cwd=repo,
        capture_output=True,
        check=False,
    )
    return done.returncode == 0


def _made_earlier(path: str, earlier: list[Any]) -> bool:
    return any(lane and any(matches(path, pat) for pat in lane.owned) for lane in earlier)


def _candidates(path: str, done: str) -> list[str]:
    roots = re.findall(r"--root\s+(\S+)|-w\s+(\S+)", done)
    return [path] + [f"{a or b}/{path}" for a, b in roots]


def problems(plan_path: Path, repo: Path = REPO_ROOT, ref: str = "") -> list[str]:
    try:
        plan: dict[str, Any] = load_plan(plan_path, repo)
    except (PlanError, OSError, yaml.YAMLError, KeyError, TypeError) as err:
        return [str(err)]
    ref = ref or working_branch(plan)
    if not _branch_exists(repo, ref):
        ref = "HEAD"
    spec_file = repo / plan["spec"]
    known = _points(spec_file.read_text()) if spec_file.exists() else set()
    found: list[str] = []
    if not str(plan.get("goal", "")).strip():
        found.append("the plan has no goal: every lane is told it, so it sees the whole picture")
    try:
        contracts = {c.name: c for c in all_contracts(repo)}
    except ConfigError as err:
        found.append(f"the agent contracts do not load: {err}")
        contracts = {}
    earlier: list[Any] = []
    for rnd in plan["rounds"]:
        owners: dict[str, Any] = {}
        for step in rnd["steps"]:
            try:
                # A step runs before the round's agents, so what it makes counts as made earlier.
                earlier.append(load_lane(step["lane"], repo))
            except LaneError as err:
                found.append(f"round {rnd['name']}: {err}")
            if re.search(r"\bgit\s+(add|commit|push)\b", step["run"]):
                found.append(f"round {rnd['name']} step {step['lane']}: git is the orchestrator's")
        for job in rnd["lanes"]:
            try:
                owners[job["lane"]] = load_lane(job["lane"], repo)
            except LaneError as err:
                found.append(f"round {rnd['name']}: {err}")
            # The check tools.factory.validate makes, here before a run: plan-w2-p4 gave
            # L-security the builder agent, and the run refused the lane at its round.
            held = contracts.get(job["agent"])
            if contracts and held is None:
                found.append(
                    f"round {rnd['name']} {job['lane']}: no contract for agent {job['agent']}"
                )
            elif held is not None and job["lane"] not in held.lanes:
                found.append(
                    f"round {rnd['name']} {job['lane']}: agent {job['agent']} has no contract "
                    f"for lane {job['lane']}"
                )
        for job in rnd["lanes"]:
            lane, where = owners.get(job["lane"]), f"round {rnd['name']} {job['lane']}"
            mission, done = str(job["mission"]), str(job["done"])
            if ONE_COMMAND.match(mission):
                found.append(f"{where}: the mission only runs a command; make it a round step")
            if lane is None:
                continue

            def owns(p: str, lane: Any = lane) -> bool:
                return bool(lane.kind == "founder" or any(matches(p, pat) for pat in lane.owned))

            for path in _writes(mission):
                if not owns(path):
                    found.append(f"{where}: the mission has it write {path}, which it does not own")
            for short in DONE_PATH.findall(done):
                paths = _candidates(short, done)
                if any(
                    _exists_at(repo, ref, p) or owns(p) or _made_earlier(p, earlier) for p in paths
                ):
                    continue
                path = paths[-1]
                other = [
                    n
                    for n, o in owners.items()
                    if n != job["lane"] and o and any(matches(path, pat) for pat in o.owned)
                ]
                why = (
                    f"only {', '.join(other)} in the same round can make it"
                    if other
                    else ("it does not exist and the lane cannot make it")
                )
                found.append(f"{where}: the done command needs {path}, but {why}")
            if re.search(r"\bgit\s+(add|commit|push)\b", done):
                found.append(f"{where}: the done command changes git; it runs in the jail")
            # agent_run hides tests/holdout from implementation lanes, so such a lane can never
            # pass a done command that reads it (W2-P1 fix: three attempts lost this way).
            if lane.kind == "implementation" and "tests/holdout" in done:
                found.append(
                    f"{where}: the done command reads tests/holdout, which is hidden from "
                    "implementation lanes; run the hidden tests as a round check"
                )
            for m in POINT.finditer(mission):
                for n in _numbers(m.group(1), m.group(2)):
                    if known and n not in known:
                        found.append(f"{where}: the mission names point {n}, not in {plan['spec']}")
            for name in BRANCH.findall(mission):
                if not _branch_exists(repo, name):
                    found.append(f"{where}: the mission names branch {name}, which does not exist")
        earlier += [o for o in owners.values() if o]
    return found


# Quick gates only the founder lane can fix. When they already fail on the branch, every lane
# that runs them fails for a reason it cannot change (step-w W1 stopped three times this way:
# dashes in the founder's docs, build output being linted, a SPEC without its share).
BASELINE: tuple[tuple[str, ...], ...] = (
    ("uv", "run", "python", "-m", "tools.copy_lint.lint"),
    ("uv", "run", "python", "-m", "tools.requirements.register", "check"),
    ("uv", "run", "ruff", "check", ".", "-q"),
)


def baseline(repo: Path = REPO_ROOT, commands: tuple[tuple[str, ...], ...] = BASELINE) -> list[str]:
    """The founder-owned gates that already fail before any agent runs."""
    found: list[str] = []
    for cmd in commands:
        done = subprocess.run(list(cmd), cwd=repo, capture_output=True, text=True, check=False)
        if done.returncode != 0:
            tail = (done.stdout + done.stderr).strip().splitlines()
            last = tail[-1] if tail else ""
            found.append(f"baseline: {' '.join(cmd[-3:])} fails before any agent runs: {last}")
    return found


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if not args:
        print("usage: python -m tools.factory.preflight <plan.yaml>")
        return 2
    found = problems(Path(args[0]).resolve())
    for problem in found:
        print(problem)
    print(f"preflight: {len(found)} problem(s)" if found else "preflight: the plan is whole")
    return 1 if found else 0


if __name__ == "__main__":
    raise SystemExit(main())
