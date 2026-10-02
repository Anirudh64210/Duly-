"""Generators and readers for specs/step-w/SPEC-W2-UNKNOWN.md section 9 (point 44).

Built from a pack's declarations only (its record kinds, field kinds, choices, links and
`when_absent`), so the same code drives the toy pack (tests/support/unknown_toy.py) and the
shipped F-1 pack. It holds no expected value.

- decided_cases(pack, seeds): a coherent timeline drawn from a seed case (a journey, or an R
  case of point 51): every date moved by one drawn shift, so the order of the timeline holds,
  and each field whose `when_absent` allows it drawn as left out (the known NONE or NOT_YET)
  often enough that `present: false` holds. Every list stated whole.
- gap(decl): the unknown samples for one field (point 44): absent on an `ask` field, not_sure,
  and the unreadable values the case schema takes in that position.
- fills(decl, case, out): the set the drawn fills of one gap come from. A test may add to it;
  it may never remove from it (point 44).
- outputs(out), withheld(out): every output keyed by id, and the ids that carry `waits_on`.

Names the SPEC adds to the engine (engine.unknown, engine.readers) are never imported here:
the tests import them inside the test, so collection passes before the engine has them.
"""

import contextlib
import copy
from collections.abc import Iterable, Sequence
from datetime import date, timedelta
from typing import Any

from hypothesis import strategies as st

from engine.rulepack import Rulepack

# Section 9: deadline off, derandomized; 150 examples for P6, 30 for P1 to P5 and P7 in
# tests/unit, 200 in tests/holdout.
UNIT_EXAMPLES = 30
LOGIC_EXAMPLES = 150
HOLDOUT_EXAMPLES = 200
# Section 9: the examples run on 2026-09-29; the properties draw today from these.
EXAMPLE_DAY = date(2026, 9, 29)
FIRST_DAY = date(2025, 1, 1)
LAST_DAY = date(2028, 12, 31)
# contracts/product_settings.yaml dates.earliest_readable and latest_readable (point 41).
EARLIEST_READABLE = date(1950, 1, 1)
LATEST_READABLE = date(2099, 12, 31)

DRAWN_FILLS = 6  # point 44: each example draws 6 fills
MAX_GAPS_PER_RECORD = 2  # point 44

UNREADABLE_DATES = ("2026-13-40", "08/03/2026", "31/08/2026", "20260803", "2026-W32-1")
UNREADABLE_NUMBERS: tuple[Any, ...] = ("40", "forty", True)
UNREADABLE_COUNTS: tuple[Any, ...] = (1.5, -1, "3")
UNREADABLE_FLAGS: tuple[Any, ...] = ("yes", 1)
OUTSIDE_CHOICE = "zz_not_a_choice"
NO_SUCH_RECORD = "zz9"

GAP_STATES = ("absent", "unreadable", "undecided")


# The pack's declarations.


def kinds(pack: Rulepack) -> dict[str, dict[str, Any]]:
    assert pack.path is not None
    return {k["id"]: k for k in pack.path["records"]}


def decl_of(pack: Rulepack, kind: str, field: str) -> dict[str, Any]:
    found = [f for f in kinds(pack)[kind]["fields"] if f["id"] == field]
    assert len(found) == 1, (kind, field)
    return dict(found[0])


def absence(decl: dict[str, Any]) -> Any:
    """The field's `when_absent`, `ask` when it has none (point 2)."""
    return decl.get("when_absent", "ask")


def absence_can_be(decl: dict[str, Any], state: str) -> bool:
    """Whether leaving the field out can give the known value `state` (none or not_yet)."""
    declared = absence(decl)
    if isinstance(declared, str):
        return declared == state
    return state in declared or declared.get("else") == state


# Gaps (point 44).


def gap(decl: dict[str, Any], run: dict[str, str] | None = None) -> list[tuple[str, Any]]:
    """Every gap sample for a field: (state, raw value), with None for absent. Absent only on
    an `ask` field (point 2: a declared none or not_yet is a known value, not a gap). `run`
    maps record ids to kinds, for the wrong-kind link."""
    samples: list[tuple[str, Any]] = [("undecided", "not_sure")]
    if absence(decl) == "ask":
        samples.append(("absent", None))
    kind = decl["kind"]
    unreadable: Sequence[Any] = ()
    if kind == "date":
        unreadable = UNREADABLE_DATES
    elif kind == "number":
        unreadable = UNREADABLE_NUMBERS
    elif kind == "count":
        unreadable = UNREADABLE_COUNTS
    elif kind == "flag":
        unreadable = UNREADABLE_FLAGS
    elif kind == "choice":
        unreadable = (OUTSIDE_CHOICE,)
    elif kind == "link":
        wrong = [rid for rid, k in (run or {}).items() if k not in decl.get("to", [])]
        unreadable = (NO_SUCH_RECORD, *wrong[:1])
    elif kind == "text" and decl.get("max_length", 120) < 120:
        unreadable = ("x" * (decl["max_length"] + 1),)
    samples.extend(("unreadable", value) for value in unreadable)
    return samples


def gap_states(decl: dict[str, Any]) -> list[str]:
    return sorted({state for state, _ in gap(decl)})


# Fills (point 44).


def _dates_in(node: Any) -> set[date]:
    found: set[date] = set()
    if isinstance(node, dict):
        for value in node.values():
            found |= _dates_in(value)
    elif isinstance(node, list):
        for value in node:
            found |= _dates_in(value)
    elif isinstance(node, str) and len(node) == 10 and node[4] == "-" and node[7] == "-":
        with contextlib.suppress(ValueError):
            found.add(date.fromisoformat(node))
    return found


def _rule_numbers(pack: Rulepack) -> set[float]:
    return {
        float(p["value"])
        for p in pack.parameters
        if isinstance(p["value"], int | float) and not isinstance(p["value"], bool)
    }


def output_dates(out: dict[str, Any]) -> set[date]:
    """Every date the output shows: computed values, windows, stages, upcoming."""
    return _dates_in([out.get("computed"), out.get("stages"), out.get("upcoming")])


def fills(
    decl: dict[str, Any],
    case: dict[str, Any],
    out: dict[str, Any],
    pack: Rulepack,
    run: dict[str, str],
) -> list[Any]:
    """The set of fills for a gap in a field (point 44), as raw case values, with the known
    NONE or NOT_YET written as None (absence on a field that declares it). Never shrunk."""
    kind = decl["kind"]
    values: list[Any] = []
    if kind == "link":
        values = [rid for rid, k in sorted(run.items()) if k in decl.get("to", [])]
    elif kind == "choice":
        values = list(decl.get("choices", []))
    elif kind == "date":
        days: set[date] = set()
        for day in _dates_in(case) | output_dates(out):
            days |= {day - timedelta(days=1), day, day + timedelta(days=1)}
        days |= {EARLIEST_READABLE, LATEST_READABLE}
        values = [d.isoformat() for d in sorted(days) if EARLIEST_READABLE <= d <= LATEST_READABLE]
    elif kind in ("number", "count"):
        numbers = {0.0}
        for n in _rule_numbers(pack):
            numbers |= {n - 1, n, n + 1}
        allowed = [n for n in sorted(numbers) if kind == "number" or n >= 0]
        values = [int(n) if n == int(n) else n for n in allowed]
    elif kind == "flag":
        values = [True, False]
    elif kind == "text":
        values = ["a", "b"]
    if absence_can_be(decl, "none") or absence_can_be(decl, "not_yet") or absence(decl) == "ask":
        # Point 2: the fill domain of an ask or none field holds NONE; of not_yet, NOT_YET.
        # Written as absence on a field that declares it; on an ask field NONE has no raw form,
        # so the test passes it through the declaration of a copy of the pack.
        values.append(None)
    return values


def must_fill(original: Any, values: Sequence[Any], fed: Iterable[date]) -> list[Any]:
    """The fills every example draws (point 44): the original value, NONE or NOT_YET where
    allowed (None), and one day either side of each output date the field feeds."""
    keep: list[Any] = [original]
    if None in values:
        keep.append(None)
    for day in fed:
        for near in (day - timedelta(days=1), day + timedelta(days=1)):
            if near.isoformat() in values:
                keep.append(near.isoformat())
    return list(dict.fromkeys(keep))


def drawn_fills(values: Sequence[Any], keep: Sequence[Any]) -> st.SearchStrategy[list[Any]]:
    """`keep` plus draws from `values`, DRAWN_FILLS in all where the set allows."""
    rest = [v for v in values if v not in keep]
    room = max(0, DRAWN_FILLS - len(keep))
    if not rest or room == 0:
        return st.just(list(keep))
    more = st.lists(
        st.sampled_from(rest), min_size=min(room, len(rest)), max_size=room, unique=True
    )
    return more.map(lambda drawn: list(keep) + drawn)


# Cases.


def run_of(case: dict[str, Any]) -> dict[str, str]:
    return {r["id"]: r["kind"] for r in case["records"]}


def shift_dates(node: Any, days: int) -> Any:
    """Every readable ISO date in a case moved by `days`; nothing else touched."""
    if isinstance(node, dict):
        return {k: shift_dates(v, days) for k, v in node.items()}
    if isinstance(node, list):
        return [shift_dates(v, days) for v in node]
    if isinstance(node, str) and len(node) == 10 and node[4] == "-" and node[7] == "-":
        try:
            return (date.fromisoformat(node) + timedelta(days=days)).isoformat()
        except ValueError:
            return node
    return node


def with_field(case: dict[str, Any], record_id: str, field: str, raw: Any) -> dict[str, Any]:
    """A copy of the case with one field set, or left out when raw is None."""
    changed = copy.deepcopy(case)
    for record in changed["records"]:
        if record["id"] == record_id:
            if raw is None:
                record["fields"].pop(field, None)
            else:
                record["fields"][field] = raw
    return changed


@st.composite
def decided_cases(
    draw: st.DrawFn, pack: Rulepack, seeds: Sequence[dict[str, Any]], max_shift: int = 60
) -> dict[str, Any]:
    """A seed case with its timeline moved by one drawn shift, and each field the pack declares
    `none` or `not_yet` drawn as left out about half the time. Lists stated whole."""
    seed = copy.deepcopy(draw(st.sampled_from(list(seeds))))
    shift = draw(st.integers(-max_shift, max_shift))
    case: dict[str, Any] = shift_dates(seed, shift)
    declared = kinds(pack)
    for record in case["records"]:
        for decl in declared[record["kind"]]["fields"]:
            if isinstance(absence(decl), str) and absence(decl) != "ask" and draw(st.booleans()):
                record["fields"].pop(decl["id"], None)
    case["complete"] = {
        k: {"on": shift_dates(on, shift)["on"]} for k, on in case.get("complete", {}).items()
    }
    return case


def present_fields(pack: Rulepack, case: dict[str, Any]) -> list[tuple[str, str]]:
    """(record id, field) for every field entered in the case, in a fixed order."""
    found: list[tuple[str, str]] = []
    declared = kinds(pack)
    for record in case["records"]:
        names = {d["id"] for d in declared[record["kind"]]["fields"]}
        found.extend((record["id"], f) for f in sorted(record["fields"]) if f in names)
    return found


# Readers of the output (point 44).


def outputs(out: dict[str, Any]) -> dict[str, Any]:
    """Each output keyed by id: computed values (limit days are their own items), window opens
    and closes, stage states and dates, upcoming dates, and the sets of judgements, conflicts
    and open items (the verdict's reasons and the questions)."""
    found: dict[str, Any] = {}
    for item in out["computed"]:
        found[f"computed:{item['id']}"] = item["value"]
    for stage in out["stages"]:
        found[f"stage:{stage['id']}"] = (stage["state"], stage.get("starts"), stage.get("ends"))
        for window in stage.get("windows", []):
            found[f"window:{window['id']}"] = (window.get("opens"), window.get("closes"))
    for entry in out.get("upcoming", []):
        found[f"upcoming:{entry.get('id')}"] = entry.get("date")
    found["reasons"] = frozenset(out["verdict"]["reasons"])
    return found


def known_outputs(out: dict[str, Any]) -> dict[str, Any]:
    """The outputs shown as known: everything but the withheld ones and the reason set."""
    held = withheld(out)
    return {k: v for k, v in outputs(out).items() if k not in held and k != "reasons"}


def withheld(out: dict[str, Any]) -> set[str]:
    """The output ids that carry `waits_on` (point 33)."""
    held: set[str] = set()
    for item in out["computed"]:
        if item.get("waits_on"):
            held.add(f"computed:{item['id']}")
    for stage in out["stages"]:
        if stage.get("waits_on"):
            held.add(f"stage:{stage['id']}")
        for window in stage.get("windows", []):
            if window.get("waits_on"):
                held.add(f"window:{window['id']}")
    for entry in out.get("upcoming", []):
        if entry.get("waits_on"):
            held.add(f"upcoming:{entry.get('id')}")
    return held


def waits_on(out: dict[str, Any], output_id: str) -> list[str]:
    kind, _, oid = output_id.partition(":")
    for item in out["computed"] if kind == "computed" else []:
        if item["id"] == oid:
            return list(item.get("waits_on", []))
    for stage in out["stages"]:
        if kind == "stage" and stage["id"] == oid:
            return list(stage.get("waits_on", []))
        for window in stage.get("windows", []):
            if kind == "window" and window["id"] == oid:
                return list(window.get("waits_on", []))
    return []


def question(out: dict[str, Any], qid: str) -> dict[str, Any] | None:
    found = [q for q in out["questions"] if q["id"] == qid]
    return found[0] if found else None


def reasons(out: dict[str, Any]) -> list[str]:
    return list(out["verdict"]["reasons"])


def gap_questions(out: dict[str, Any]) -> list[dict[str, Any]]:
    """Questions about a value (point 34): those with a `state`."""
    return [q for q in out["questions"] if q.get("state")]
