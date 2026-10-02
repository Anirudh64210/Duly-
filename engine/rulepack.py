"""Load and validate rule packs against contracts/rulepack.schema.json."""

import itertools
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator, FormatChecker

from engine.settings import SettingsError, dating_setting, load_settings

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "contracts" / "rulepack.schema.json"
PACKS_DIR = REPO_ROOT / "rulepacks"


QUOTE_NEEDED = frozenset({"settled", "guidance", "litigated", "proposed"})


class RulepackError(ValueError):
    pass


@dataclass(frozen=True)
class Rulepack:
    category: str
    version: str
    regimes: tuple[dict[str, Any], ...]
    parameters: tuple[dict[str, Any], ...]
    path: dict[str, Any] | None = None

    @property
    def rules_checked_on(self) -> date | None:
        """The oldest checked_on among the parameters, or None for an empty pack."""
        checked = [date.fromisoformat(p["source"]["checked_on"]) for p in self.parameters]
        return min(checked, default=None)

    def value(self, id: str, on: date, regime: str | None = None) -> dict[str, Any] | None:
        """The parameter in force on a date, or None when nothing is in force.

        With no regime named, the lookup runs under the operative regimes. A rule with no
        regime of its own applies under every regime, and a row written for the regime
        comes before it.
        """
        known = {r["id"] for r in self.regimes}
        if regime is None:
            wanted = {r["id"] for r in self.regimes if r["operative"]}
        elif regime in known:
            wanted = {regime}
        else:
            raise RulepackError(f"{id}: unknown regime {regime}")
        day = on.isoformat()
        in_force = [
            p
            for p in self.parameters
            if p["id"] == id
            and p["effective_from"] <= day
            and (p.get("effective_to") is None or day <= p["effective_to"])
        ]
        for regimes in (wanted, {""}):
            found = [p for p in in_force if p.get("regime", "") in regimes]
            if len(found) > 1:
                raise RulepackError(f"{id}: more than one operative regime holds this rule")
            if found:
                return found[0]
        return None


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
        if p["status"] in QUOTE_NEEDED and not str(p["source"].get("quote", "")).strip():
            raise RulepackError(f"{p['id']}: a {p['status']} rule needs a quote from its source")
        key = (p["id"], regime, p["effective_from"])
        if key in seen:
            raise RulepackError(f"{p['id']}: duplicate for the same regime and start date")
        seen.add(key)
        end = p.get("effective_to")
        if end is not None and end < p["effective_from"]:
            raise RulepackError(f"{p['id']}: ends before it starts")
    _reject_overlaps(data["parameters"])
    _reject_misplaced_settings(data.get("path"), (), load_settings())

    return Rulepack(
        category=data["category"],
        version=data["version"],
        regimes=tuple(data["regimes"]),
        parameters=tuple(data["parameters"]),
        path=data.get("path"),
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


def _reject_misplaced_settings(node: Any, trail: tuple[Any, ...], settings: dict[str, Any]) -> None:
    """A product setting may move only the opens or closes of a stage's window, which makes
    it a planning window (contracts/rulepack.schema.json, setting). The schema shares the
    amount shape with every date, so the refusal anywhere else is here. The settings are read
    once per pack, by the caller."""
    if isinstance(node, list):
        for index, child in enumerate(node):
            _reject_misplaced_settings(child, (*trail, index), settings)
        return
    if not isinstance(node, dict):
        return
    is_amount = "setting" in node and set(node) <= {"setting", "sign"}
    # path/stages/<n>/windows/<n>/(opens|closes)/...
    in_window = trail[:1] == ("stages",) and trail[2:3] == ("windows",)
    if is_amount and not (in_window and trail[4:5] in (("opens",), ("closes",))):
        where = "/".join(str(step) for step in ("path", *trail))
        raise RulepackError(
            f"{where}: the setting {node['setting']} may date only a stage window's opens or closes"
        )
    if is_amount:
        # Refused here, not at the first compute: an unknown id, or a unit no date moves by.
        try:
            dating_setting(settings, node["setting"])
        except SettingsError as refused:
            where = "/".join(str(step) for step in ("path", *trail))
            raise RulepackError(f"{where}: {refused}") from refused
    for key, child in node.items():
        _reject_misplaced_settings(child, (*trail, key), settings)


def load_pack(path: Path) -> Rulepack:
    raw = yaml.safe_load(path.read_text())
    if not isinstance(raw, dict):
        raise RulepackError(f"{path}: not a mapping")
    return validate_pack(raw)


def load_all(packs_dir: Path = PACKS_DIR) -> list[Rulepack]:
    return [load_pack(p) for p in sorted(packs_dir.glob("*/v*/parameters.yaml"))]
