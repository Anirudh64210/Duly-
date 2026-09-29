"""Load and validate rule packs against contracts/rulepack.schema.json."""

import itertools
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator, FormatChecker

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "contracts" / "rulepack.schema.json"
PACKS_DIR = REPO_ROOT / "rulepacks"


class RulepackError(ValueError):
    pass


@dataclass(frozen=True)
class Rulepack:
    category: str
    version: str
    regimes: tuple[dict[str, Any], ...]
    parameters: tuple[dict[str, Any], ...]


def _normalize(value: Any) -> Any:
    """YAML parses bare dates into date objects; the schema speaks ISO strings."""
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize(v) for v in value]
    return value


def validate_pack(raw: dict[str, Any]) -> Rulepack:
    schema = json.loads(SCHEMA_PATH.read_text())
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    data = _normalize(raw)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    if errors:
        first = errors[0]
        where = "/".join(str(p) for p in first.path) or "(root)"
        raise RulepackError(f"{where}: {first.message}")

    regimes = {r["id"]: r for r in data["regimes"]}
    seen: set[tuple[str, str, str]] = set()
    for p in data["parameters"]:
        regime = p.get("regime", "")
        if regime and regime not in regimes:
            raise RulepackError(f"{p['id']}: unknown regime {regime}")
        key = (p["id"], regime, p["effective_from"])
        if key in seen:
            raise RulepackError(f"{p['id']}: duplicate for the same regime and start date")
        seen.add(key)
        end = p.get("effective_to")
        if end is not None and end < p["effective_from"]:
            raise RulepackError(f"{p['id']}: ends before it starts")
    _reject_overlaps(data["parameters"])

    return Rulepack(
        category=data["category"],
        version=data["version"],
        regimes=tuple(data["regimes"]),
        parameters=tuple(data["parameters"]),
    )


def _reject_overlaps(parameters: list[dict[str, Any]]) -> None:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for p in parameters:
        groups.setdefault((p["id"], p.get("regime", "")), []).append(p)
    for (pid, _), group in groups.items():
        ordered = sorted(group, key=lambda p: str(p["effective_from"]))
        for earlier, later in itertools.pairwise(ordered):
            end = earlier.get("effective_to")
            if end is None or end >= later["effective_from"]:
                raise RulepackError(f"{pid}: effective dates overlap")


def load_pack(path: Path) -> Rulepack:
    raw = yaml.safe_load(path.read_text())
    if not isinstance(raw, dict):
        raise RulepackError(f"{path}: not a mapping")
    return validate_pack(raw)


def load_all(packs_dir: Path = PACKS_DIR) -> list[Rulepack]:
    return [load_pack(p) for p in sorted(packs_dir.glob("*/v*/parameters.yaml"))]
