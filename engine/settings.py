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


# A setting can date a window only in these units, given here by the engine's own names.
DATING_UNITS = {
    "days": "days",
    "business days": "business_days",
    "months": "months",
    "years": "years",
}


def whole_setting(settings: Mapping[str, Any], setting_id: str) -> int:
    """The value of one setting, which must be a whole number of zero or more."""
    return _whole_entry(settings, setting_id)[0]


def dating_setting(settings: Mapping[str, Any], setting_id: str) -> tuple[int, str]:
    """The value of one setting and its unit, read together, for a setting that dates a
    window: a whole number of days, business days, months or years."""
    value, unit = _whole_entry(settings, setting_id)
    if unit not in DATING_UNITS:
        raise SettingsError(f"{setting_id}: the unit {unit!r} cannot date a window")
    return value, DATING_UNITS[unit]


def _whole_entry(settings: Mapping[str, Any], setting_id: str) -> tuple[int, str]:
    entries = settings.get("settings")
    if not isinstance(entries, list):
        raise SettingsError("the settings hold no list named settings")
    found = [entry for entry in entries if entry.get("id") == setting_id]
    if len(found) != 1:
        raise SettingsError(f"{setting_id}: the settings hold {len(found)} entries, not one")
    value = found[0]["value"]
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise SettingsError(
            f"{setting_id}: the engine needs a whole number of zero or more, "
            f"the settings give {value!r}"
        )
    return value, str(found[0].get("unit"))
