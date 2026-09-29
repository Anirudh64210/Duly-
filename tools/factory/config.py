"""Load the factory's numbers and the agents' contracts, and refuse anything malformed."""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator

from tools.factory.paths import REPO_ROOT


class ConfigError(ValueError):
    pass


def load_config(root: Path = REPO_ROOT) -> dict[str, Any]:
    data = yaml.safe_load((root / "factory" / "config.yaml").read_text())
    for section in ("model", "limits", "budgets", "gates", "approval_required", "network"):
        if section not in data:
            raise ConfigError(f"factory/config.yaml has no {section}")
    if data["network"]["default"] != "deny":
        raise ConfigError("network.default must be deny")
    if data["limits"]["max_subagent_depth"] != 0:
        raise ConfigError("agents may not start agents: max_subagent_depth must be 0")
    return dict(data)


@dataclass(frozen=True)
class Contract:
    name: str
    version: int
    role: str
    role_file: str
    lanes: tuple[str, ...]
    inputs: tuple[str, ...]
    outputs: tuple[str, ...]
    tools: tuple[str, ...]
    model: str
    max_turns: int
    max_attempts: int
    token_budget: int
    budget_usd: float
    timeout_minutes: int
    stop_conditions: tuple[str, ...]
    network: tuple[str, ...]
    may_write: bool
    health_task: str
    health_passes_when: str


def _problems(schema_file: Path, data: Any) -> list[str]:
    validator = Draft202012Validator(json.loads(schema_file.read_text()))
    return [
        ("/".join(str(p) for p in e.path) or "(root)") + ": " + e.message
        for e in sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    ]


def load_contract(name: str, root: Path = REPO_ROOT) -> Contract:
    path = root / "factory" / "agents" / f"{name}.yaml"
    if not path.exists():
        raise ConfigError(f"no contract for agent {name}")
    raw = yaml.safe_load(path.read_text())
    found = _problems(root / "contracts" / "factory_agent.schema.json", raw)
    if found:
        raise ConfigError(f"{path.name}: {found[0]}")
    config = load_config(root)
    if raw["name"] != name:
        raise ConfigError(f"{path.name}: name is {raw['name']}")
    if raw["model"] != config["model"]["pinned"]:
        raise ConfigError(f"{name}: model {raw['model']} is not the pinned model")
    if raw["budget_usd"] > config["budgets"]["per_task_usd"]:
        raise ConfigError(f"{name}: budget is above the cap for one task")
    if raw["max_attempts"] > config["limits"]["max_retries_per_task"]:
        raise ConfigError(f"{name}: more attempts than the factory allows")
    if not (root / raw["role_file"]).exists():
        raise ConfigError(f"{name}: {raw['role_file']} does not exist")
    if not raw["may_write"] and {"Edit", "Write"} & set(raw["tools"]):
        raise ConfigError(f"{name}: a read only agent cannot hold Edit or Write")
    health = raw.pop("health_check")
    fields: dict[str, Any] = {k: tuple(v) if isinstance(v, list) else v for k, v in raw.items()}
    return Contract(**fields, health_task=health["task"], health_passes_when=health["passes_when"])


def all_contracts(root: Path = REPO_ROOT) -> list[Contract]:
    return [
        load_contract(p.stem, root) for p in sorted((root / "factory" / "agents").glob("*.yaml"))
    ]


def report_problems(report: Any, root: Path = REPO_ROOT) -> list[str]:
    return _problems(root / "contracts" / "factory_report.schema.json", report)


def review_problems(review: Any, root: Path = REPO_ROOT) -> list[str]:
    found = _problems(root / "contracts" / "factory_review.schema.json", review)
    if found:
        return found
    gates = load_config(root)["gates"]
    scores = [line["score"] for line in review["scores"].values()]
    low = [
        name
        for name, line in review["scores"].items()
        if line["score"] < gates["reviewer_rubric_min"]
    ]
    blocking = [f for f in review["findings"] if f["severity"] == "blocking"]
    mean = sum(scores) / len(scores)
    must_veto = bool(low or blocking or mean < gates["reviewer_rubric_mean_min"])
    if must_veto and review["decision"] != "VETO":
        return [
            f"the scores call for a veto (low: {low}, blocking: {len(blocking)}, "
            f"mean {mean:.2f}) but the decision is APPROVE"
        ]
    return []
