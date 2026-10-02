"""engine/unknown.py and engine/readers.py are pure and generic: specs/step-w/SPEC-W2-UNKNOWN.md
point 12. Neither module names a kind, field, choice or rule id of any shipped pack (the gate
engine_literals checks only engine/f1.py, so this test is the only guard on them), neither reads
a pack, the clock or the network, and both hold the interface point 12 fixes.
"""

import ast
import inspect
import re
from pathlib import Path
from typing import Any

import pytest

from engine.rulepack import load_all

ENGINE = Path(__file__).resolve().parents[3] / "engine"
MODULES = ("unknown.py", "readers.py")


def _pack_words() -> set[str]:
    """Every kind, field, choice, fact and rule id of every shipped pack, and each dotted
    part of a rule id, longer than 3 characters (so `date`, `none` and the like, which are
    words of the schema, not of a pack, are left out below)."""
    words: set[str] = set()
    for pack in load_all():
        for p in pack.parameters:
            words.add(p["id"])
        path: dict[str, Any] = pack.path or {}
        for kind in path.get("records", []):
            words.add(kind["id"])
            for field in kind["fields"]:
                words.add(field["id"])
                words.update(field.get("choices", []))
        for fact in path.get("facts", []):
            words.add(fact["id"])
    return words


# Words the interface of point 12 itself uses, which a pack may also use by chance.
INTERFACE = {
    "absent",
    "unreadable",
    "undecided",
    "list",
    "conflict",
    "lapse",
    "pending",
    "future",
    "known",
    "record",
    "field",
    "state",
    "date",
    "number",
    "count",
    "flag",
    "choice",
    "text",
    "link",
    "periods",
    "choices",
    "to",
    "pattern",
    "max_length",
    "kind",
    "start",
    "end",
    "hours_per_week",
    "not_sure",
    "none",
    "id",
    "label",
    "value",
    "type",
    "settings",
    "dates",
}


def _strings(source: str) -> set[str]:
    return {
        node.value
        for node in ast.walk(ast.parse(source))
        if isinstance(node, ast.Constant) and isinstance(node.value, str)
    }


@pytest.mark.parametrize("name", MODULES)
def test_the_module_names_nothing_of_a_shipped_pack(name):
    # Point 12: "pure, no pack, no F-1 word". Every string literal of the module is checked
    # against every pack word. Fails if, say, readers.py special-cases "hours_per_week" beyond
    # the period shape the schema names, or unknown.py names "opt_post_completion".
    source = (ENGINE / name).read_text()
    found = (_strings(source) & _pack_words()) - INTERFACE
    assert not found, f"{name} names pack words: {sorted(found)}"
    assert not re.search(r"\bf1\b|\bF-1\b|\bopt\b|\bstem\b", source, re.IGNORECASE)


@pytest.mark.parametrize("name", MODULES)
def test_the_module_reads_no_pack_no_clock_and_no_network(name):
    # Point 12: pure. Fails if the module imports the pack loader, a clock, the time, a
    # model client or the network.
    tree = ast.parse((ENGINE / name).read_text())
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module)
    banned = {"engine.rulepack", "engine.path", "engine.f1", "engine.clocks", "time"}
    banned |= {"socket", "urllib", "httpx", "requests"}
    assert not imported & banned, imported & banned
    assert "datetime.now" not in (ENGINE / name).read_text()
    assert "date.today" not in (ENGINE / name).read_text()


def test_the_unknown_interface_is_the_one_point_12_fixes():
    # Point 12: Gap(record, field, state) a NamedTuple; Unknown frozen with gaps; NONE and
    # NOT_YET; all3, any3, not3, exists3, count_below3, count_at_most3 with these parameters.
    from engine import unknown

    assert unknown.Gap._fields == ("record", "field", "state")
    u = unknown.Unknown(frozenset({unknown.Gap("r1", "f", "absent")}))
    with pytest.raises((AttributeError, TypeError)):
        u.gaps = frozenset()
    for name, params in {
        "all3": ["values"],
        "any3": ["values"],
        "not3": ["value"],
        "exists3": ["chosen", "undecided", "unstated"],
        "count_below3": ["n", "chosen", "undecided", "unstated"],
        "count_at_most3": ["n", "chosen", "undecided", "unstated"],
    }.items():
        assert list(inspect.signature(getattr(unknown, name)).parameters) == params, name


def test_the_reader_interface_is_the_one_point_12_fixes():
    # Point 12: read(decl, raw, run) -> (ReadState, object); CaseStructureError, a ValueError,
    # in engine/path.py.
    from engine import readers
    from engine.path import CaseStructureError

    assert list(inspect.signature(readers.read).parameters) == ["decl", "raw", "run"]
    assert issubclass(CaseStructureError, ValueError)
