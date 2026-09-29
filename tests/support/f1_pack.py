"""Test packs and case builders for Phase 2, built in code from the SPEC.

specs/phase-2/SPEC.md, "The tests": build test packs in code with the SPEC values, so the
tests do not depend on L-content. Nothing here imports engine.dates or engine.f1, so the
helpers load before the engine lane has written a line.

The quotes below are placeholders for a test pack. They are not the words of any source.
"""

import calendar
import copy
import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator, FormatChecker

from engine.clocks import FixedClock
from engine.rulepack import Rulepack, validate_pack

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_SCHEMA = json.loads((REPO_ROOT / "contracts" / "engine_output.schema.json").read_text())
CASE_SCHEMA = json.loads((REPO_ROOT / "contracts" / "case_f1.schema.json").read_text())

OPERATIVE = "ds_2012"
BLOCKED = "fixed_admission_2026"
URL = "https://www.ecfr.gov/current/title-8/section-214.2"

# Every rule starts long before any date a test uses, so a test never depends on which
# date the engine passes to Rulepack.value. Effective dates have their own tests in
# tests/unit/engine/test_rulepack_values.py.
EFFECTIVE_FROM = "2000-01-01"

# SPEC, "The rules": id, value, unit, status, regime, where to look.
# The last five rows are from specs/phase-2/SPEC-sourcing.md, "Rules to find and source",
# with the assumed values. The two after them are from specs/phase-2/SPEC-fixes.md,
# "Finding 5". New rows come last so that the position of every earlier row holds.
SPEC_RULES: tuple[tuple[str, int | str, str, str, str, str], ...] = (
    ("opt.apply_before_days", 90, "days", "settled", "", "8 CFR 214.2(f)(11)(i)(B)"),
    ("opt.apply_after_days", 60, "days", "settled", "", "8 CFR 214.2(f)(11)(i)(B)"),
    (
        "opt.file_within_days_of_recommendation",
        30,
        "days",
        "settled",
        "",
        "8 CFR 214.2(f)(11)(i)(B)",
    ),
    ("opt.max_months", 12, "months", "settled", "", "8 CFR 214.2(f)(10)"),
    ("opt.complete_within_months", 14, "months", "settled", "", "8 CFR 214.2(f)(10)(ii)(A)(3)"),
    ("opt.unemployment_limit_days", 90, "days", "settled", "", "8 CFR 214.2(f)(10)(ii)(E)"),
    ("stem.unemployment_limit_days", 150, "days", "settled", "", "8 CFR 214.2(f)(10)(ii)(E)"),
    ("stem.extension_months", 24, "months", "settled", "", "8 CFR 214.2(f)(10)(ii)(C)"),
    ("stem.apply_before_expiry_days", 90, "days", "settled", "", "8 CFR 214.2(f)(11)(i)(C)"),
    (
        "stem.file_within_days_of_recommendation",
        60,
        "days",
        "settled",
        "",
        "8 CFR 214.2(f)(11)(i)(C)",
    ),
    ("stem.min_hours_per_week", 20, "hours_per_week", "settled", "", "8 CFR 214.2(f)(10)(ii)(C)"),
    ("stem.validation_interval_months", 6, "months", "settled", "", "8 CFR 214.2(f)(12)(ii)"),
    (
        "stem.validation_due_business_days",
        10,
        "business_days",
        "settled",
        "",
        "8 CFR 214.2(f)(12)(ii)",
    ),
    ("stem.evaluation_due_days", 10, "days", "settled", "", "8 CFR 214.2(f)(10)(ii)(C)(9)"),
    ("stem.new_plan_due_days", 10, "days", "settled", "", "8 CFR 214.2(f)(10)(ii)(C)"),
    ("cpt.full_time_months_bar", 12, "months", "settled", "", "8 CFR 214.2(f)(10)(i)"),
    ("grace.after_completion_days", 60, "days", "litigated", OPERATIVE, "8 CFR 214.2(f)(5)(iv)"),
    ("grace.after_completion_days", 30, "days", "litigated", BLOCKED, "8 CFR 214.2(f)(5)"),
    ("opt.min_hours_per_week", 20, "hours_per_week", "guidance", "", "SEVP guidance"),
    ("capgap.end_month_day", "04-01", "date", "settled", "", "8 CFR 214.2(f)(5)(vi)"),
    (
        "stem.evaluation_interval_months",
        12,
        "months",
        "settled",
        "",
        "8 CFR 214.2(f)(10)(ii)(C)(9)",
    ),
    ("cpt.full_time_bar_days", 365, "days", "school", "", "8 CFR 214.2(f)(10)(i)"),
    ("capgap.fiscal_year_start_month_day", "10-01", "date", "settled", "", "31 U.S.C. 1102"),
    ("opt.report_employer_within_days", 10, "days", "guidance", "", "SEVP guidance"),
    ("calendar.federal_holidays_law", True, "flag", "settled", "", "5 U.S.C. 6103(a)"),
    ("opt.latest_start_after_days", 60, "days", "settled", "", "8 CFR 214.2(f)(11)(i)(D)"),
    ("stem.apply_window_closes_rule", True, "flag", "settled", "", "8 CFR 214.2(f)(11)(i)(C)"),
)

# specs/phase-2/SPEC-sourcing.md, "Duly's own choices": id, value, unit. The values are
# those of contracts/product_settings.yaml, written here so that a test never depends on
# the shipped file unless it says so.
SPEC_SETTINGS: tuple[tuple[str, int, str], ...] = (
    ("product.open_item_lookahead_days", 14, "days"),
    ("product.opt_start_earliest_years_before_program_end", 1, "years"),
)
SETTINGS_PATH = REPO_ROOT / "contracts" / "product_settings.yaml"

# A second pack where every number the engine uses differs from the SPEC value. An engine
# that writes a rule value in its own code gives the wrong answer under this pack.
# SPEC, "Rules of the house": every number comes from the pack by id.
SHIFTED: dict[tuple[str, str], int | str] = {
    ("opt.apply_before_days", ""): 91,
    ("opt.apply_after_days", ""): 61,
    ("opt.file_within_days_of_recommendation", ""): 31,
    ("opt.complete_within_months", ""): 15,
    ("opt.unemployment_limit_days", ""): 89,
    ("stem.unemployment_limit_days", ""): 151,
    ("stem.apply_before_expiry_days", ""): 92,
    ("stem.file_within_days_of_recommendation", ""): 59,
    ("stem.min_hours_per_week", ""): 25,
    ("stem.validation_due_business_days", ""): 11,
    ("stem.evaluation_due_days", ""): 9,
    ("grace.after_completion_days", OPERATIVE): 61,
    ("grace.after_completion_days", BLOCKED): 29,
    ("opt.min_hours_per_week", ""): 21,
    ("capgap.end_month_day", ""): "05-15",
    # SPEC-fixes, "Finding 5": opt.latest_start has its own rule. It is shifted by the
    # same day as opt.apply_after_days, so every date expected under this pack holds.
    ("opt.latest_start_after_days", ""): 61,
}

# SPEC, "Rules of the house": from strongest to weakest.
STATUS_ORDER = ("settled", "guidance", "school", "litigated", "proposed")


def source(rule_id: str, citation: str, checked_on: str) -> dict[str, Any]:
    return {
        "citation": citation,
        "url": URL,
        "checked_on": checked_on,
        "quote": f"placeholder words for {rule_id} in a test pack",
    }


def pack_dict(
    checked_on: str | date = "2026-09-28",
    values: dict[tuple[str, str], int | str] | None = None,
    statuses: dict[str, str] | None = None,
    leave_out: tuple[str, ...] = (),
) -> dict[str, Any]:
    """The SPEC pack as a raw mapping. values and statuses replace single entries.

    leave_out names rules the pack does not hold.
    """
    checked = checked_on.isoformat() if isinstance(checked_on, date) else checked_on
    parameters = []
    for rule_id, value, unit, status, regime, citation in SPEC_RULES:
        if rule_id in leave_out:
            continue
        parameter: dict[str, Any] = {
            "id": rule_id,
            "value": (values or {}).get((rule_id, regime), value),
            "unit": unit,
            "status": (statuses or {}).get(rule_id, status),
            "effective_from": EFFECTIVE_FROM,
            "source": source(rule_id, citation, checked),
        }
        if regime:
            parameter["regime"] = regime
        parameters.append(parameter)
    return {
        "category": "f1",
        "jurisdiction": "us",
        "version": "v2026.09",
        "regimes": [
            {
                "id": OPERATIVE,
                "legal_status": "effective",
                "operative": True,
                "source": source(OPERATIVE, "8 CFR 214.2(f)(5)(iv)", checked),
            },
            {
                "id": BLOCKED,
                "legal_status": "enjoined",
                "operative": False,
                "source": source(BLOCKED, "FR Doc. 2026-14439", checked),
            },
        ],
        "parameters": parameters,
    }


def build_pack(
    checked_on: str | date = "2026-09-28",
    values: dict[tuple[str, str], int | str] | None = None,
    statuses: dict[str, str] | None = None,
    leave_out: tuple[str, ...] = (),
) -> Rulepack:
    return validate_pack(pack_dict(checked_on, values, statuses, leave_out))


def with_operative_status(raw_pack: dict[str, Any], legal_status: str) -> dict[str, Any]:
    """A deep copy of the raw pack whose operative regime has another legal status."""
    changed = copy.deepcopy(raw_pack)
    for regime in changed["regimes"]:
        if regime["operative"]:
            regime["legal_status"] = legal_status
    return changed


def with_regime_rows(
    raw_pack: dict[str, Any], rule_id: str, operative: int | str, blocked: int | str
) -> dict[str, Any]:
    """A deep copy of the raw pack where one rule has a row under each regime, as the
    shipped pack has for a rule whose words differ between the two texts."""
    changed = copy.deepcopy(raw_pack)
    rows = []
    for parameter in changed["parameters"]:
        if parameter["id"] != rule_id:
            rows.append(parameter)
            continue
        for regime, value in ((OPERATIVE, operative), (BLOCKED, blocked)):
            rows.append({**copy.deepcopy(parameter), "regime": regime, "value": value})
    changed["parameters"] = rows
    return changed


def settings_dict(values: dict[str, int] | None = None) -> dict[str, Any]:
    """Test settings in the shape of contracts/product_settings.yaml once parsed.

    values replaces single entries by id.
    """
    return {
        "settings": [
            {
                "id": setting_id,
                "value": (values or {}).get(setting_id, value),
                "unit": unit,
                "decided_in": f"placeholder decision for {setting_id} in test settings",
                "meaning": f"placeholder meaning for {setting_id} in test settings",
            }
            for setting_id, value, unit in SPEC_SETTINGS
        ]
    }


def shipped_settings() -> dict[str, Any]:
    """contracts/product_settings.yaml as parsed."""
    found: dict[str, Any] = yaml.safe_load(SETTINGS_PATH.read_text())
    return found


def settings_named(output: dict[str, Any]) -> dict[str, list[str]]:
    """The ids under duly_settings in each item's inputs, by item id. Empty when absent."""
    return {
        item_id: list(item["inputs"].get("duly_settings", []))
        for item_id, item in items(output).items()
    }


def rule_value(raw_pack: dict[str, Any], rule_id: str, regime: str = "") -> Any:
    """Read a value straight from the raw pack, without the engine."""
    for parameter in raw_pack["parameters"]:
        if parameter["id"] == rule_id and parameter.get("regime", "") == regime:
            return parameter["value"]
    raise KeyError(rule_id)


def rule_statuses(raw_pack: dict[str, Any]) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for parameter in raw_pack["parameters"]:
        found.setdefault(parameter["id"], set()).add(parameter["status"])
    return found


def weakest(statuses: list[str]) -> str:
    return max(statuses, key=STATUS_ORDER.index)


def clock_on(day: date) -> FixedClock:
    return FixedClock(datetime(day.year, day.month, day.day, 12, 0, tzinfo=UTC))


def iso(day: date | None) -> str | None:
    return None if day is None else day.isoformat()


def ead(
    recommended: str | None, filed: str | None, start: str | None, end: str | None
) -> dict[str, Any]:
    """An opt or stem block of the case contract."""
    return {
        "dso_recommendation_date": recommended,
        "i765_filed_date": filed,
        "ead_start": start,
        "ead_end": end,
    }


def job(start: str, end: str | None, hours: float = 40, reported: bool = True) -> dict[str, Any]:
    return {"start": start, "end": end, "hours_per_week": hours, "employer_reported": reported}


def cap_gap(
    requested_start: str,
    status: str = "pending",
    change_of_status: bool = True,
    petition_filed_on: str = "2026-04-02",
) -> dict[str, Any]:
    return {
        "petition_filed_on": petition_filed_on,
        "requested_start": requested_start,
        "change_of_status": change_of_status,
        "status": status,
    }


def with_changes(case: dict[str, Any], **changes: Any) -> dict[str, Any]:
    """A deep copy of the case with top-level fields replaced."""
    return {**copy.deepcopy(case), **changes}


def with_block(case: dict[str, Any], block: str, **changes: Any) -> dict[str, Any]:
    """A deep copy of the case with fields of one block (opt, stem, cap_gap) replaced."""
    changed = copy.deepcopy(case)
    changed[block] = {**changed[block], **changes}
    return changed


def items(output: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Computed items by id. Fails if an id appears twice."""
    found: dict[str, dict[str, Any]] = {}
    for item in output["computed"]:
        assert item["id"] not in found, f"{item['id']} appears twice"
        found[item["id"]] = item
    return found


def values(output: dict[str, Any]) -> dict[str, Any]:
    return {item_id: item["value"] for item_id, item in items(output).items()}


def contract_problems(output: dict[str, Any]) -> list[str]:
    """Every way the output departs from contracts/engine_output.schema.json."""
    validator = Draft202012Validator(OUTPUT_SCHEMA, format_checker=FormatChecker())
    return [error.message for error in validator.iter_errors(output)]


def case_problems(case: dict[str, Any]) -> list[str]:
    """Every way a case departs from contracts/case_f1.schema.json."""
    validator = Draft202012Validator(CASE_SCHEMA, format_checker=FormatChecker())
    return [error.message for error in validator.iter_errors(case)]


def reasons_with(output: dict[str, Any], prefix: str) -> list[str]:
    return [r for r in output["verdict"]["reasons"] if r.startswith(prefix)]


# Reference arithmetic, written apart from the engine, used by the property tests.


def months_later(day: date, months: int) -> date:
    """SPEC, engine/dates.py: add_months clamps to the last day of the month."""
    index = day.year * 12 + (day.month - 1) + months
    year, month = divmod(index, 12)
    return date(year, month + 1, min(day.day, calendar.monthrange(year, month + 1)[1]))


def count_days(
    case: dict[str, Any], today: date, opt_min: float, stem_min: float
) -> dict[str, int]:
    """SPEC, "Counting days", day by day.

    The window runs from opt.ead_start through the earlier of today and the last EAD end
    date, both included. A period covers its start and its end. An open period runs
    through today.
    """
    start = date.fromisoformat(case["opt"]["ead_start"])
    ends = [date.fromisoformat(case["opt"]["ead_end"])]
    stem_start = None
    if case.get("stem"):
        ends.append(date.fromisoformat(case["stem"]["ead_end"]))
        stem_start = date.fromisoformat(case["stem"]["ead_start"])
    last = min(today, max(ends))
    periods = [
        (
            date.fromisoformat(p["start"]),
            today if p["end"] is None else date.fromisoformat(p["end"]),
            p["hours_per_week"],
        )
        for p in case["employment"]
    ]
    counts = {"window": 0, "used": 0, "under": 0, "employed": 0}
    day = start
    while day <= last:
        counts["window"] += 1
        threshold = stem_min if stem_start is not None and day >= stem_start else opt_min
        hours = [h for (first, final, h) in periods if first <= day <= final]
        if not hours:
            counts["used"] += 1
        elif max(hours) >= threshold:
            counts["employed"] += 1
        else:
            counts["under"] += 1
        day += timedelta(days=1)
    return counts
