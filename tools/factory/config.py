"""Load the factory's numbers and the agents' contracts, and refuse anything malformed."""

import json
import re
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
    retired: bool = False  # no plan runs it, so it needs no health check


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


POINT = re.compile(r"\b(?:points?|SPEC)\s+(\d+[a-z]?)\b", re.I)
CITED = re.compile(r"\bBOUNDARY\b|\b\d+\s+(?:CFR|C\.F\.R\.|U\.S\.C\.)|\bINA\b|§|https?://")


def spec_point(finding: dict[str, Any]) -> str:
    """The SPEC point a finding names, or nothing."""
    if finding.get("spec_point"):
        return str(finding["spec_point"])
    found = POINT.search(f"{finding.get('title', '')} {finding.get('what_happens', '')}")
    return found.group(1) if found else ""


def is_blocking(finding: dict[str, Any]) -> bool:
    """A finding blocks only when it breaks a named SPEC point, a BOUNDARY rule or a cited
    source. A blocking finding that names none is refused by review_problems."""
    text = f"{finding.get('title', '')} {finding.get('what_happens', '')}"
    return finding.get("severity") == "blocking" and bool(spec_point(finding) or CITED.search(text))


def review_problems(review: Any, root: Path = REPO_ROOT) -> list[str]:
    """The one rule for a review, which the orchestrator and golden both apply. A finding is
    blocking only when it names the SPEC point, BOUNDARY rule or cited source it breaks; the
    decision is a veto exactly when a finding blocks; and low scores need a blocking finding."""
    found = _problems(root / "contracts" / "factory_review.schema.json", review)
    if found:
        return found
    for n, finding in enumerate(review["findings"]):
        if finding["severity"] == "blocking" and not is_blocking(finding):
            return [
                f"findings/{n}: a blocking finding must name the SPEC point, BOUNDARY rule or "
                "cited source it breaks, in spec_point"
            ]
    gates = load_config(root)["gates"]
    scores = {name: line["score"] for name, line in review["scores"].items()}
    low = [name for name, score in scores.items() if score < gates["reviewer_rubric_min"]]
    mean = sum(scores.values()) / len(scores)
    blocking = sum(f["severity"] == "blocking" for f in review["findings"])
    if not blocking and (low or mean < gates["reviewer_rubric_mean_min"]):
        return [
            f"the scores call for a veto (low: {low}, mean {mean:.2f}) but no finding blocks: "
            "a veto must name a blocking finding, one that breaks a named SPEC point, a BOUNDARY "
            "rule or a cited source"
        ]
    if (review["decision"] == "VETO") != bool(blocking):
        call = "a veto" if blocking else "approval"
        return [
            f"{blocking} blocking findings call for {call}; the decision is {review['decision']}"
        ]
    return []
