"""The toy pack covers the engine: specs/step-w/SPEC-W2-UNKNOWN.md point 50b. The pack in
tests/support/unknown_toy.py uses every operator, every `when` shape, every calculator, every
group, a history, an `optional` member, `ends_also`, `bind` and a next stage, a conditional
`when_absent`, and a rule row not in force on some drawn day (section 9 draws today from
2025-01-01 to 2028-12-31). The lists of operators, shapes, calculators and groups are read from
contracts/rulepack.schema.json, so a new one fails here until the toy pack uses it, except the
features point 11 refuses at load (window_opens, window_closes, follows, gap_allowed,
stage.lists[].only_if), which no pack may use.
"""

import json
from collections.abc import Iterator
from datetime import date
from pathlib import Path
from typing import Any

from tests.support.gaps import FIRST_DAY, LAST_DAY
from tests.support.unknown_toy import pack_dict

SCHEMA = json.loads(
    (Path(__file__).resolve().parents[3] / "contracts" / "rulepack.schema.json").read_text()
)
DEFS = SCHEMA["$defs"]
REFUSED = {"window_opens", "window_closes", "follows", "gap_allowed"}
RAW = pack_dict()


def _nodes(node: Any) -> Iterator[dict[str, Any]]:
    if isinstance(node, dict):
        yield node
        for child in node.values():
            yield from _nodes(child)
    elif isinstance(node, list):
        for child in node:
            yield from _nodes(child)


def _keys_used() -> set[str]:
    return {key for node in _nodes(RAW["path"]) for key in node}


def test_every_operator_is_used():
    # Point 50b. Fails if an operator of the schema's condition is in no toy condition.
    operators = set(DEFS["condition"]["properties"]) - {"field"}
    conditions = [n for n in _nodes(RAW["path"]) if "field" in n or set(n) & operators]
    used = {k for n in conditions for k in n if k in operators}
    bare_flag = any(set(n) == {"field"} for n in conditions)
    assert bare_flag, "no condition reads a field alone"
    assert operators - used == set(), sorted(operators - used)


def test_every_when_shape_is_used():
    shapes = set(DEFS["when"]["properties"]) - REFUSED
    assert shapes - _keys_used() == set(), sorted(shapes - _keys_used())


def test_every_calculator_and_group_is_used():
    counters = RAW["path"]["counters"]
    calculators = set(DEFS["counter"]["properties"]["calculator"]["enum"])
    groups = set(DEFS["counter"]["properties"]["scope"]["properties"]["group"]["enum"])
    assert calculators - {c["calculator"] for c in counters} == set()
    assert groups - {c["scope"]["group"] for c in counters} == set()
    assert any("not_qualifying" in c for c in counters)
    assert any("only_if" in c for c in counters)


def test_history_optional_ends_also_bind_and_a_next_stage_are_used():
    fields = [f for k in RAW["path"]["records"] for f in k["fields"]]
    assert any("history" in f for f in fields)
    assert any(n.get("optional") is True for n in _nodes(RAW["path"]))
    stages = RAW["path"]["stages"]
    assert any("ends_also" in s.get("span", {}) for s in stages)
    steps = [step for s in stages for step in s.get("next", []) if isinstance(step, dict)]
    assert any("bind" in step for step in steps)
    assert any("only_if" in step for step in steps)
    assert {step["stage"] for step in steps} <= {s["id"] for s in stages}


def test_every_absence_and_a_conditional_one_are_declared():
    # Points 2 and 2a: ask (the default), not_yet, none, and an object with each branch.
    declared = [f.get("when_absent", "ask") for k in RAW["path"]["records"] for f in k["fields"]]
    assert {"ask", "not_yet", "none"} <= {d for d in declared if isinstance(d, str)}
    objects = [d for d in declared if isinstance(d, dict)]
    assert any("not_yet" in d for d in objects)
    assert any("none" in d for d in objects)


def test_every_field_kind_and_declared_facts_are_used():
    kinds = set(DEFS["record_field"]["properties"]["kind"]["enum"])
    used = {f["kind"] for k in RAW["path"]["records"] for f in k["fields"]}
    assert kinds - used == set(), sorted(kinds - used)
    assert RAW["path"]["facts"], "point 25: the toy pack declares facts"


def test_a_rule_row_is_not_in_force_on_some_drawn_day():
    # Section 9 draws today from 2025-01-01 to 2028-12-31. A row in force from 2026-01-01 to
    # 2026-12-31 is not in force on 2025-01-01 (before) nor on 2028-12-31 (after).
    lapsing = [p for p in RAW["parameters"] if p.get("effective_to")]
    assert lapsing
    for row in lapsing:
        start = date.fromisoformat(row["effective_from"])
        end = date.fromisoformat(row["effective_to"])
        assert start > FIRST_DAY or end < LAST_DAY
    read = json.dumps(RAW["path"])
    assert any(f'"{row["id"]}"' in read for row in lapsing)  # and the path reads it
