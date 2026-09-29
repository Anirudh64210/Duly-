"""engine/rulepack.py additions for Phase 2.

Specified in specs/phase-2/SPEC.md, "The engine", "Files":
  Rulepack.value(id, on, regime=None) returns the parameter in force on a date under the
  operative regime, or under the named one.
  Rulepack.rules_checked_on is the oldest checked_on among its parameters, or None for an
  empty pack.
  A parameter with status settled, guidance, litigated, or proposed that has no quote is
  refused.

The SPEC says value "returns the parameter". These tests read the number from whatever
comes back: a bare value, a mapping with a "value" key, or an object with a value
attribute. The question is logged in tests/PROGRESS.md.
"""

import copy
from collections.abc import Mapping
from datetime import date
from typing import Any

import pytest

from engine.rulepack import Rulepack, RulepackError, validate_pack
from tests.support.f1_pack import BLOCKED, OPERATIVE, build_pack, pack_dict, source

CHECKED = "2026-09-28"


def number(found: Any) -> Any:
    if isinstance(found, Mapping):
        return found["value"]
    if hasattr(found, "value") and not isinstance(found, int | float | str):
        return found.value
    return found


def not_in_force(pack: Rulepack, rule_id: str, on: date, regime: str | None = None) -> bool:
    """True when the pack gives no value: it raises, or it returns None.

    The SPEC does not say which. Either way it must not hand back a number.
    """
    try:
        found = pack.value(rule_id, on, regime=regime)
    except (RulepackError, LookupError):
        return True
    return found is None


def parameter(rule_id: str, value: int, start: str, end: str | None = None, **more: Any):
    built = {
        "id": rule_id,
        "value": value,
        "unit": "days",
        "status": "settled",
        "effective_from": start,
        "source": source(rule_id, "8 CFR 214.2(f)", CHECKED),
        **more,
    }
    if end is not None:
        built["effective_to"] = end
    return built


def dated_pack() -> Rulepack:
    """One rule with two back-to-back versions, and one rule under two regimes."""
    raw = pack_dict(CHECKED)
    raw["parameters"] = [
        parameter("opt.unemployment_limit_days", 90, "2008-04-08", "2026-05-31"),
        parameter("opt.unemployment_limit_days", 100, "2026-06-01"),
        parameter(
            "grace.after_completion_days", 60, "2000-01-01", regime=OPERATIVE, status="litigated"
        ),
        parameter(
            "grace.after_completion_days", 30, "2026-09-15", regime=BLOCKED, status="litigated"
        ),
    ]
    return validate_pack(raw)


# Lookup by date


@pytest.mark.parametrize(
    ("on", "expected"),
    [
        (date(2008, 4, 8), 90),  # the first day of the first version
        (date(2008, 4, 9), 90),  # the day after
        (date(2026, 5, 30), 90),  # the day before the first version's last day
        (date(2026, 5, 31), 90),  # effective_to is the last day in force
        (date(2026, 6, 1), 100),  # the first day of the second version
        (date(2026, 6, 2), 100),  # the day after
        (date(2040, 1, 1), 100),  # an open-ended version stays in force
    ],
)
def test_value_is_the_version_in_force_on_the_date(on, expected):
    assert number(dated_pack().value("opt.unemployment_limit_days", on)) == expected


def test_no_value_the_day_before_the_first_version_starts():
    assert not_in_force(dated_pack(), "opt.unemployment_limit_days", date(2008, 4, 7))


def test_no_value_for_an_id_the_pack_does_not_hold():
    assert not_in_force(dated_pack(), "opt.no_such_rule", date(2026, 9, 28))


def test_every_spec_rule_is_found_by_id():
    raw = pack_dict(CHECKED)
    pack = validate_pack(raw)
    for p in raw["parameters"]:
        if p.get("regime", "") in ("", OPERATIVE):
            assert number(pack.value(p["id"], date(2026, 9, 28))) == p["value"]


# Lookup by regime


def test_value_without_a_regime_uses_the_operative_one():
    # ds_2012 is operative in the pack and gives 60. The blocked regime gives 30.
    assert number(dated_pack().value("grace.after_completion_days", date(2026, 9, 28))) == 60


def test_value_under_a_named_regime():
    pack = dated_pack()
    on = date(2026, 9, 28)
    assert number(pack.value("grace.after_completion_days", on, regime=BLOCKED)) == 30
    assert number(pack.value("grace.after_completion_days", on, regime=OPERATIVE)) == 60


def test_named_regime_respects_its_own_effective_date():
    pack = dated_pack()
    # The blocked regime's rule starts on 2026-09-15.
    assert not_in_force(pack, "grace.after_completion_days", date(2026, 9, 14), regime=BLOCKED)
    assert (
        number(pack.value("grace.after_completion_days", date(2026, 9, 15), regime=BLOCKED)) == 30
    )
    assert (
        number(pack.value("grace.after_completion_days", date(2026, 9, 16), regime=BLOCKED)) == 30
    )


def test_operative_is_read_from_the_pack_not_from_the_regime_name():
    raw = pack_dict(CHECKED)
    for regime in raw["regimes"]:
        regime["operative"] = regime["id"] == BLOCKED
        regime["legal_status"] = "effective" if regime["id"] == BLOCKED else "rescinded"
    pack = validate_pack(raw)
    # With the flags swapped, the default lookup gives the other regime's 30.
    assert number(pack.value("grace.after_completion_days", date(2026, 9, 28))) == 30
    assert (
        number(pack.value("grace.after_completion_days", date(2026, 9, 28), regime=OPERATIVE)) == 60
    )


def test_a_rule_under_the_blocked_regime_never_leaks_into_the_default_lookup():
    raw = pack_dict(CHECKED)
    raw["parameters"] = [
        p
        for p in raw["parameters"]
        if not (p["id"] == "grace.after_completion_days" and p.get("regime") == OPERATIVE)
    ]
    pack = validate_pack(raw)
    # Only the blocked regime holds the rule now. The default lookup must not return 30.
    assert not_in_force(pack, "grace.after_completion_days", date(2026, 9, 28))


# rules_checked_on


def test_rules_checked_on_is_the_oldest_among_the_parameters():
    raw = pack_dict("2026-09-28")
    raw["parameters"][3]["source"]["checked_on"] = "2026-09-20"
    raw["parameters"][7]["source"]["checked_on"] = "2026-09-25"
    assert validate_pack(raw).rules_checked_on == date(2026, 9, 20)


def test_rules_checked_on_when_every_parameter_was_checked_the_same_day():
    assert build_pack("2026-09-27").rules_checked_on == date(2026, 9, 27)


def test_rules_checked_on_is_none_for_an_empty_pack():
    raw = pack_dict(CHECKED)
    raw["parameters"] = []
    assert validate_pack(raw).rules_checked_on is None


# Quotes


def without_quote(status: str) -> dict[str, Any]:
    raw = copy.deepcopy(pack_dict(CHECKED))
    target = raw["parameters"][0]
    target["status"] = status
    del target["source"]["quote"]
    return raw


@pytest.mark.parametrize("status", ["settled", "guidance", "litigated", "proposed"])
def test_a_rule_without_a_quote_is_refused(status):
    with pytest.raises(RulepackError, match="quote"):
        validate_pack(without_quote(status))


def test_the_refusal_names_the_rule():
    with pytest.raises(RulepackError, match=r"opt\.apply_before_days"):
        validate_pack(without_quote("settled"))


def test_a_school_rule_without_a_quote_loads():
    # The SPEC lists four statuses that need a quote. School is not among them.
    assert validate_pack(without_quote("school"))


@pytest.mark.parametrize("status", ["settled", "guidance", "litigated", "proposed", "school"])
def test_a_rule_with_a_quote_loads(status):
    raw = pack_dict(CHECKED)
    raw["parameters"][0]["status"] = status
    assert validate_pack(raw)
