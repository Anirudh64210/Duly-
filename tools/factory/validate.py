"""Gate 7. The factory's own files must be whole before anything runs.

Checks the config, every agent contract, every plan, the golden tasks, and that the
pinned model is the only model any of them names. The one exception is the health probe's
model (D67), which must be on the list below and named by no contract.
"""

import sys
from pathlib import Path
from typing import Any

import yaml

from tools.diff_policy.check import LaneError, load_lane
from tools.factory.billing import settings_problems
from tools.factory.config import ConfigError, all_contracts, load_config
from tools.factory.paths import REPO_ROOT
from tools.factory.phase import PlanError, load_plan

HEALTH_PROBE_MODELS = ("claude-haiku-4-5-20251001",)


def problems(root: Path = REPO_ROOT) -> list[str]:
    found: list[str] = []
    try:
        config = load_config(root)
        contracts = {c.name: c for c in all_contracts(root)}
    except (ConfigError, OSError, yaml.YAMLError) as err:
        return [str(err)]
    for name, contract in contracts.items():
        for lane in contract.lanes:
            try:
                load_lane(lane, root)
            except LaneError as err:
                found.append(f"contract {name}: {err}")
    jobs: list[tuple[str, dict[str, Any]]] = []
    for path in sorted((root / "specs").glob("**/plan*.yaml")):
        try:
            plan = load_plan(path, root)
        except (PlanError, OSError, yaml.YAMLError, KeyError, TypeError) as err:
            found.append(f"{path.relative_to(root)}: {err}")
            continue
        jobs += [
            (str(path.relative_to(root)), job) for rnd in plan["rounds"] for job in rnd["lanes"]
        ]
    golden = root / "evals" / "factory" / "golden.yaml"
    if golden.exists():
        tasks = yaml.safe_load(golden.read_text())["tasks"]
        jobs += [("evals/factory/golden.yaml", task) for task in tasks]
        if not tasks:
            found.append("evals/factory/golden.yaml holds no tasks")
    else:
        found.append("evals/factory/golden.yaml is missing")
    for where, job in jobs:
        held = contracts.get(job["agent"])
        if held is None:
            found.append(f"{where}: no contract for agent {job['agent']}")
        elif job["lane"] not in held.lanes:
            found.append(f"{where}: agent {job['agent']} has no contract for lane {job['lane']}")
    found += settings_problems(root)
    if config["model"]["pinned"] != config["model"]["reviewer"]:
        found.append("the reviewer's model differs from the pinned model")
    probe = config["model"].get("health_probe")
    if probe and probe not in HEALTH_PROBE_MODELS:
        found.append(f"model.health_probe {probe} is not one of {', '.join(HEALTH_PROBE_MODELS)}")
    if probe and any(c.model == probe for c in contracts.values()):
        found.append(f"model.health_probe {probe} is for health probes only; a contract names it")
    return found


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else REPO_ROOT
    found = problems(root)
    for problem in found:
        print(problem)
    if found:
        print(f"factory: {len(found)} problem(s)")
        return 1
    print("factory: config, contracts, plans and golden tasks are whole")
    return 0


if __name__ == "__main__":
    sys.exit(main())
