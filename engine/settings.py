"""Duly's own choices, read by id from contracts/product_settings.yaml.

A setting is not law and is never shown as law. It has no place in a rule pack, and the
engine never lists one under rule_ids.
"""

from collections.abc import Mapping
from pathlib import Path
from typing import Any

import yaml

SETTINGS_PATH = Path(__file__).resolve().parents[1] / "contracts" / "product_settings.yaml"


class SettingsError(Exception):
    """The settings lack an id the engine needs, or hold a value it cannot use."""


def load_settings(path: Path = SETTINGS_PATH) -> dict[str, Any]:
    """The settings file as parsed."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise SettingsError(f"{path}: the settings file is not a mapping")
    return raw


def whole_setting(settings: Mapping[str, Any], setting_id: str) -> int:
    """The value of one setting, which must be a whole number of zero or more."""
    entries = settings.get("settings")
    if not isinstance(entries, list):
        raise SettingsError("the settings hold no list named settings")
    found = [entry["value"] for entry in entries if entry.get("id") == setting_id]
    if len(found) != 1:
        raise SettingsError(f"{setting_id}: the settings hold {len(found)} entries, not one")
    value = found[0]
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise SettingsError(
            f"{setting_id}: the engine needs a whole number of zero or more, "
            f"the settings give {value!r}"
        )
    return value
