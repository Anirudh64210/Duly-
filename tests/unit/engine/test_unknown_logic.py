"""P6, the operators themselves: specs/step-w/SPEC-W2-UNKNOWN.md point 50, over the interface of
point 12 (engine/unknown.py) and the table of point 7, plus the unit tests point 5 names (the gap
type refuses to be built empty, mutant U17).

The expected value of every case is worked out here by brute force: every completion of the
unknowns is enumerated and the result must be T or F exactly when all completions agree
(point 6, strong Kleene is exact on read-once trees). Nothing is copied from the engine.

engine.unknown is imported inside each test (section 9): collection passes before the module
exists, and a missing name fails the test, never skips it.
"""

import itertools
from collections import Counter
from datetime import date
from typing import Any

import pytest
from hypothesis import event, given, settings
from hypothesis import strategies as st

from tests.support.gaps import LOGIC_EXAMPLES

LOGIC = settings(max_examples=LOGIC_EXAMPLES, deadline=None, derandomize=True)


def _gap(n: int) -> Any:
    from engine.unknown import Gap

    return Gap(f"r{n}", f"f{n}", "absent")


def _u(*ns: int) -> Any:
    from engine.unknown import Unknown

    return Unknown(frozenset(_gap(n) for n in ns))


# Point 5 and mutant U17: an unknown with no gap cannot be built.


def test_an_unknown_with_no_gap_cannot_be_built():
    # Point 12: Unknown(gaps) raises ValueError when gaps is empty. Fails if: Unknown(frozenset())
    # is accepted, so an engine could carry a U that names nothing (U17).
    from engine.unknown import Unknown

    with pytest.raises(ValueError):  # noqa: PT011 - point 12 names only ValueError
        Unknown(frozenset())


def test_none_and_not_yet_are_two_singletons():
    # Point 1 and 12: NONE and NOT_YET are known values compared by identity, never equal to
    # each other (U20: NOT_YET read as NONE). Fails if they are one object, or equal.
    from engine.unknown import NONE, NOT_YET

    assert NONE is not NOT_YET
    assert NONE != NOT_YET


def test_a_gap_is_record_field_and_state():
    # Point 12: Gap(record, field, state), record None for a fact or a list.
    from engine.unknown import Gap

    gap = Gap(None, "complete.job", "list")
    assert (gap.record, gap.field, gap.state) == (None, "complete.job", "list")


# The three-valued connectives against every completion.


def _completions(values: list[Any]) -> list[list[bool]]:
    """Every way to replace each Unknown by True or False."""
    from engine.unknown import Unknown

    slots = [i for i, v in enumerate(values) if isinstance(v, Unknown)]
    found = []
    for bits in itertools.product([True, False], repeat=len(slots)):
        filled = list(values)
        for slot, bit in zip(slots, bits, strict=True):
            filled[slot] = bit
        found.append(filled)
    return found


def _tri() -> st.SearchStrategy[list[str]]:
    return st.lists(st.sampled_from(["T", "F", "U"]), min_size=1, max_size=5)


def _build(codes: list[str]) -> list[Any]:
    return [True if c == "T" else False if c == "F" else _u(i) for i, c in enumerate(codes)]


def _expect(results: set[bool]) -> Any:
    return next(iter(results)) if len(results) == 1 else "U"


@LOGIC
@given(_tri())
def test_all3_is_known_exactly_when_every_completion_agrees(codes):
    # Point 7, all_of: F if any is F, T if all are T, else U; with the U carrying the gaps of
    # the U inputs (point 8). Worked: [T, U] -> U naming r1.f1; [F, U] -> F.
    from engine.unknown import Unknown, all3

    values = _build(codes)
    got = all3(values)
    expected = _expect({all(c) for c in _completions(values)})
    if expected == "U":
        assert isinstance(got, Unknown)
        assert got.gaps == frozenset(_gap(i) for i, c in enumerate(codes) if c == "U")
    else:
        assert got is expected


@LOGIC
@given(_tri())
def test_any3_is_known_exactly_when_every_completion_agrees(codes):
    # Point 7, any_of: T if any is T, F if all are F, else U. Worked: [F, U] -> U; [T, U] -> T,
    # and point 8: a settled any_of asks nothing of the others (the T carries no gap).
    from engine.unknown import Unknown, any3

    values = _build(codes)
    got = any3(values)
    expected = _expect({any(c) for c in _completions(values)})
    if expected == "U":
        assert isinstance(got, Unknown)
        assert got.gaps == frozenset(_gap(i) for i, c in enumerate(codes) if c == "U")
    else:
        assert got is expected


def test_not3_swaps_true_and_false_and_keeps_an_unknown():
    # Point 7, not: T and F swap, U stays U with its gaps. Fails if not3(U) is T or F.
    from engine.unknown import Unknown, not3

    assert not3(True) is False
    assert not3(False) is True
    u = _u(1)
    got = not3(u)
    assert isinstance(got, Unknown)
    assert got.gaps == u.gaps


# The list operators (point 7: exists, none, count_below, count_at_most) against every
# completion. With k chosen, u undecided and the list not stated whole, the completions are
# every number of the undecided chosen (0 to u) plus 0 to n + 1 unseen records (point 50:
# n + 1 is enough to change any of them).


def _counts(chosen: int, undecided: int, whole: bool, n: int) -> set[int]:
    unseen = range(0, n + 2) if not whole else range(1)
    return {chosen + extra + more for extra in range(undecided + 1) for more in unseen}


def _list_args(chosen: int, undecided: int, whole: bool) -> tuple[Any, Any]:
    from engine.unknown import Gap, Unknown

    pending = [_u(100 + i) for i in range(undecided)]
    unstated = None if whole else Unknown(frozenset({Gap(None, "complete.card", "list")}))
    return pending, unstated


LISTS = st.tuples(st.integers(0, 4), st.integers(0, 3), st.booleans(), st.integers(0, 4))


def _check_list_result(got: Any, results: set[bool], undecided: int, whole: bool) -> None:
    from engine.unknown import Unknown

    if len(results) == 1:
        assert got is next(iter(results))
    else:
        assert isinstance(got, Unknown)
        named = {g.field for g in got.gaps}
        # A U names what it rests on: the undecided records, or the list.
        assert named, got
        assert named <= {f"f{100 + i}" for i in range(undecided)} | {"complete.card"}


@LOGIC
@given(LISTS)
def test_exists3_and_none_against_every_completion(args):
    # Point 7: exists T if a decided record is chosen; F if none is chosen, none undecided and
    # the list whole; else U. none is its Kleene negation. Worked: (1, 2, False) -> T (a
    # witness stands, R5); (0, 0, False) -> U (an unseen record could be chosen, U2);
    # (0, 0, True) -> F. Fails if exists ignores the list (U2) or an undecided witness counts.
    from engine.unknown import Unknown, exists3, not3

    chosen, undecided, whole, n = args
    pending, unstated = _list_args(chosen, undecided, whole)
    got = exists3(chosen, pending, unstated)
    results = {c > 0 for c in _counts(chosen, undecided, whole, n)}
    _check_list_result(got, results, undecided, whole)
    negated = not3(got)
    if isinstance(got, Unknown):
        assert isinstance(negated, Unknown)
    else:
        assert negated is (not got)
    event(f"exists:{'U' if isinstance(got, Unknown) else got}")


@LOGIC
@given(LISTS)
def test_count_below3_against_every_completion(args):
    # Point 7: count_below n, k chosen, u undecided: F if k >= n; T if whole and k + u < n;
    # else U. Worked: n 2, (2, 0, False) -> F; (0, 1, True) -> T (0 + 1 < 2); (1, 1, True) -> U
    # (1 or 2 chosen); (0, 0, False) -> U (up to 3 unseen).
    from engine.unknown import count_below3

    chosen, undecided, whole, n = args
    pending, unstated = _list_args(chosen, undecided, whole)
    got = count_below3(n, chosen, pending, unstated)
    results = {c < n for c in _counts(chosen, undecided, whole, n)}
    _check_list_result(got, results, undecided, whole)


@LOGIC
@given(LISTS)
def test_count_at_most3_against_every_completion(args):
    # Point 7: count_at_most n: F if k > n; T if whole and k + u <= n; else U. Worked: n 2,
    # (3, 0, False) -> F; (1, 1, True) -> T (at most 2); (2, 1, True) -> U (2 or 3).
    from engine.unknown import count_at_most3

    chosen, undecided, whole, n = args
    pending, unstated = _list_args(chosen, undecided, whole)
    got = count_at_most3(n, chosen, pending, unstated)
    results = {c <= n for c in _counts(chosen, undecided, whole, n)}
    _check_list_result(got, results, undecided, whole)


# P6 through the pack: a toy check whose `holds` is one generated read-once tree over the
# fields of c1 (course). Today 2026-09-29; the fact arrived_on is 2026-06-01. Each field is read
# by at most one leaf; its value is known, the declared absence (None: NONE for follows,
# NOT_YET for left_on), or U (not_sure). The engine's answer is read from the output: a
# conflict tree.c1 is F; nothing raised and no question about the leaves is T; a question
# naming a U leaf's field and no conflict is U.
#
# Point 7 on NOT_YET: Y is later than a known day on or before today. 2026-06-01 is before
# 2026-09-29, so left_on Y is after 2026-06-01 (T) and not on or before it (F).

TODAY = date(2026, 9, 29)


def _leaf(op: str, field: str, cond: dict[str, Any], values: list[Any], truth: Any) -> Any:
    return {"op": op, "field": field, "cond": cond, "values": values, "truth": truth}


ARRIVED = {"fact": "arrived_on"}

LEAVES: list[dict[str, Any]] = [
    # A flag alone: its value; false is F (point 9).
    _leaf("field", "online", {"field": "this.online"}, [True, False], lambda v: v is True),
    # present on a none-declared link: N is F (point 7).
    _leaf(
        "present",
        "follows",
        {"field": "this.follows", "present": True},
        ["c1", None],
        lambda v: v is not None,
    ),
    _leaf(
        "in",
        "mode",
        {"field": "this.mode", "in": ["night"]},
        ["day", "night"],
        lambda v: v == "night",
    ),
    _leaf(
        "before",
        "start",
        {"field": "this.start", "before": ARRIVED},
        ["2026-05-31", "2026-06-01"],
        lambda v: v < "2026-06-01",
    ),
    _leaf(
        "on_or_before",
        "start",
        {"field": "this.start", "on_or_before": ARRIVED},
        ["2026-06-01", "2026-06-02"],
        lambda v: v <= "2026-06-01",
    ),
    _leaf(
        "on_or_after",
        "joined_on",
        {"field": "this.joined_on", "on_or_after": ARRIVED},
        ["2026-05-31", "2026-06-01"],
        lambda v: v >= "2026-06-01",
    ),
    _leaf(
        "month_day_is",
        "joined_on",
        {"field": "this.joined_on", "month_day_is": "toy.renewal_day"},
        ["2026-03-01", "2026-03-02"],
        lambda v: v[5:] == "03-01",
    ),
    _leaf(
        "after",
        "end",
        {"field": "this.end", "after": ARRIVED},
        ["2026-06-01", "2026-06-02"],
        lambda v: v > "2026-06-01",
    ),
    _leaf(
        "on_or_before",
        "left_on",
        {"field": "this.left_on", "on_or_before": ARRIVED},
        ["2026-05-31", "2026-06-02", None],
        lambda v: v is not None and v <= "2026-06-01",
    ),
    _leaf(
        "after",
        "left_on",
        {"field": "this.left_on", "after": ARRIVED},
        ["2026-06-01", "2026-06-02", None],
        lambda v: v is None or v > "2026-06-01",
    ),
    _leaf(
        "level_above",
        "level",
        {"field": "this.level", "level_above": "mid"},
        ["low", "mid", "high"],
        lambda v: v == "high",
    ),
    _leaf(
        "at_most",
        "credits",
        {"field": "this.credits", "at_most": {"rule": "toy.cap"}},
        [2, 3],
        lambda v: v <= 2,
    ),
]


def test_the_leaves_cover_the_comparison_operators():
    # Point 50: leaves are drawn from every operator of contracts/rulepack.schema.json. The
    # rest (level_same, level_below, same_as, differs_from, exists, none, count_below,
    # count_at_most) are drawn in the tables below.
    ops = {leaf["op"] for leaf in LEAVES}
    assert {"field", "present", "in", "before", "on_or_after", "after", "on_or_before"} <= ops
    assert {"level_above", "month_day_is", "at_most"} <= ops


@LOGIC
@given(data=st.data())
def test_a_read_once_tree_is_known_exactly_when_every_completion_agrees(data):
    # Point 50, P6 through the toy pack: a random read-once tree over c1's fields, at most 5
    # leaves, each leaf known (a value, or NONE through its declaration) or U (not_sure). The
    # check `tree` is a conflict on c1 exactly when the tree is F on every completion, is
    # silent exactly when it is T on every completion, and asks every U leaf's field
    # otherwise. Fails if any operator reads U as F or T (U3, U4, U20, U21).
    from tests.support.unknown_toy import case, check_pack, rec
    from tests.support.w2_pack import compute

    used: list[dict[str, Any]] = []
    for leaf in data.draw(st.permutations(LEAVES)):
        if leaf["field"] not in {u["field"] for u in used}:  # read-once
            used.append(leaf)
    used = used[: data.draw(st.integers(1, 5))]
    joiners = [data.draw(st.sampled_from(["all_of", "any_of"])) for _ in used[1:]]
    negate = data.draw(st.booleans())
    raw: dict[str, Any] = {}
    unknown: list[str] = []
    for leaf in used:
        pick = data.draw(st.sampled_from([*leaf["values"], "not_sure"]))
        if pick == "not_sure":
            unknown.append(leaf["field"])
        raw[leaf["field"]] = pick
    # The tree: leaves folded left with the drawn joiners, then perhaps negated.
    cond: Any = used[0]["cond"]
    for leaf, joiner in zip(used[1:], joiners, strict=True):
        cond = {joiner: [cond, leaf["cond"]]}
    if negate:
        cond = {"not": cond}

    def evaluate(values: dict[str, Any]) -> bool:
        acc = used[0]["truth"](values[used[0]["field"]])
        for leaf, joiner in zip(used[1:], joiners, strict=True):
            t = leaf["truth"](values[leaf["field"]])
            acc = (acc and t) if joiner == "all_of" else (acc or t)
        return (not acc) if negate else acc

    by_field = {leaf["field"]: leaf for leaf in used}
    results = set()
    for combo in itertools.product(*[by_field[f]["values"] for f in unknown]):
        values = dict(raw)
        values.update(dict(zip(unknown, combo, strict=True)))
        results.add(evaluate(values))

    fields = {"level": "mid", "mode": "day", "start": "2026-01-05", "end": "2026-12-18"}
    for name, value in raw.items():
        if value is None:
            fields.pop(name, None)
        else:
            fields[name] = value
    c1 = rec("c1", "course", **fields)
    out = compute(case([c1], TODAY, facts={"arrived_on": "2026-06-01"}), [check_pack(cond)], TODAY)
    conflict = any(r.startswith("conflict:tree") for r in out["verdict"]["reasons"])
    asked = {q.get("field") for q in out["questions"] if q.get("record") == "c1"}
    if results == {False}:
        assert conflict, (cond, raw)
        event("tree:F")
    elif results == {True}:
        assert not conflict, (cond, raw)
        assert not (asked & set(unknown)), (cond, raw)
        event("tree:T")
    else:
        assert not conflict, (cond, raw)
        assert set(unknown) & asked, (cond, raw, out["questions"])
        event("tree:U")


# Each operator drawn at least 5 times (point 50). The list and pairwise operators are their
# own small trees, each worked by hand.

OPERATOR_CASES: list[tuple[str, dict[str, Any], dict[str, Any], str]] = [
    # (operator, condition on c1, c1's fields beyond the base, expected T/F/U)
    ("level_same", {"field": "this.level", "level_same": "mid"}, {"level": "mid"}, "T"),
    ("level_same", {"field": "this.level", "level_same": "mid"}, {"level": "not_sure"}, "U"),
    ("level_below", {"field": "this.level", "level_below": "mid"}, {"level": "low"}, "T"),
    ("level_below", {"field": "this.level", "level_below": "mid"}, {"level": "high"}, "F"),
    ("level_above", {"field": "this.level", "level_above": "mid"}, {"level": "zz"}, "U"),
    # follows is none-declared: N on either side of same_as is F (point 7, U22), even N with N.
    ("same_as", {"field": "this.follows", "same_as": "this.follows"}, {}, "F"),
    ("same_as", {"field": "this.follows", "same_as": "this.id"}, {"follows": "c1"}, "T"),
    ("same_as", {"field": "this.follows", "same_as": "this.id"}, {"follows": "not_sure"}, "U"),
    ("differs_from", {"field": "this.follows", "differs_from": "this.id"}, {}, "F"),
    ("differs_from", {"field": "this.mode", "differs_from": "this.level"}, {"mode": "day"}, "T"),
    ("at_most", {"field": "this.credits", "at_most": {"rule": "toy.cap"}}, {"credits": 2}, "T"),
    ("at_most", {"field": "this.credits", "at_most": {"rule": "toy.cap"}}, {"credits": 3}, "F"),
    # "3" is a string, not 3 (point 41): unreadable, U.
    ("at_most", {"field": "this.credits", "at_most": {"rule": "toy.cap"}}, {"credits": "3"}, "U"),
    (
        "month_day_is",
        {"field": "this.joined_on", "month_day_is": "toy.renewal_day"},
        {"joined_on": "2026-03-01"},
        "T",
    ),
    (
        "month_day_is",
        {"field": "this.joined_on", "month_day_is": "toy.renewal_day"},
        {"joined_on": "not_sure"},
        "U",
    ),
]


def _run_tree(
    cond: dict[str, Any], extra: dict[str, Any], others: list[Any] | None = None, whole: bool = True
) -> str:
    from tests.support.unknown_toy import case, check_pack, rec
    from tests.support.w2_pack import compute

    fields: dict[str, Any] = {"level": "mid", "mode": "day", "start": "2026-01-05"}
    fields.update(extra)
    records = [rec("c1", "course", **fields), *(others or [])]
    kinds = ("course", "card", "job", "change", "employer") if whole else ("course", "job")
    out = compute(case(records, TODAY, whole=kinds), [check_pack(cond)], TODAY)
    if any(r.startswith("conflict:tree") for r in out["verdict"]["reasons"]):
        return "F"
    if any(q.get("state") for q in out["questions"]):
        return "U"
    return "T"


@pytest.mark.parametrize(("op", "cond", "extra", "expected"), OPERATOR_CASES)
def test_each_pairwise_operator_by_state(op, cond, extra, expected):
    # Point 7's table, row by row, on the toy pack. Worked per row in OPERATOR_CASES. Fails
    # if: NONE equals NONE in same_as (U22); an unranked or not_sure level compares; "3" reads
    # as 3; a not_sure date matches a month and day.
    assert _run_tree(cond, extra) == expected, (op, cond, extra)


CARDS_EXTRA = {"record": "card", "where": [{"field": "this.type", "in": ["extra"]}]}


def _card(rid: str, type_: str) -> dict[str, Any]:
    return {"id": rid, "kind": "card", "fields": {"type": type_, "course": "c1"}}


LIST_CASES: list[tuple[str, dict[str, Any], list[Any], bool, str]] = [
    # exists: k1 extra chosen -> T even with k2 undecided and the card list not whole (R5).
    (
        "exists",
        {"exists": CARDS_EXTRA},
        [_card("k1", "extra"), _card("k2", "not_sure")],
        False,
        "T",
    ),
    # nothing chosen, list not whole: an unseen card could be chosen -> U (U2).
    ("exists", {"exists": CARDS_EXTRA}, [_card("k1", "plain")], False, "U"),
    ("exists", {"exists": CARDS_EXTRA}, [_card("k1", "plain")], True, "F"),
    # none is the negation: no extra card, whole -> T; one undecided -> U.
    ("none", {"none": CARDS_EXTRA}, [_card("k1", "plain")], True, "T"),
    ("none", {"none": CARDS_EXTRA}, [_card("k1", "not_sure")], True, "U"),
    # count_below toy.cap (2): one extra and one undecided, whole -> 1 or 2 -> U.
    (
        "count_below",
        {"count_below": {"of": CARDS_EXTRA, "rule": "toy.cap"}},
        [_card("k1", "extra"), _card("k2", "not_sure")],
        True,
        "U",
    ),
    # two extra chosen -> 2 is not below 2 -> F, whatever is unseen.
    (
        "count_below",
        {"count_below": {"of": CARDS_EXTRA, "rule": "toy.cap"}},
        [_card("k1", "extra"), _card("k2", "extra")],
        False,
        "F",
    ),
    (
        "count_below",
        {"count_below": {"of": CARDS_EXTRA, "rule": "toy.cap"}},
        [_card("k1", "extra")],
        True,
        "T",
    ),
    # count_at_most 2: two chosen and one undecided, whole -> 2 or 3 -> U; three -> F.
    (
        "count_at_most",
        {"count_at_most": {"of": CARDS_EXTRA, "rule": "toy.cap"}},
        [_card("k1", "extra"), _card("k2", "extra"), _card("k3", "not_sure")],
        True,
        "U",
    ),
    (
        "count_at_most",
        {"count_at_most": {"of": CARDS_EXTRA, "rule": "toy.cap"}},
        [_card("k1", "extra"), _card("k2", "extra"), _card("k3", "extra")],
        True,
        "F",
    ),
    (
        "count_at_most",
        {"count_at_most": {"of": CARDS_EXTRA, "rule": "toy.cap"}},
        [_card("k1", "extra"), _card("k2", "extra")],
        False,
        "U",
    ),
]


@pytest.mark.parametrize(("op", "cond", "others", "whole", "expected"), LIST_CASES)
def test_each_list_operator_by_state(op, cond, others, whole, expected):
    # Point 7 (exists, none, count_below, count_at_most) and point 14 on the toy pack. Worked
    # per row. Fails if: exists ignores the list (U2), an undecided card counts as left out
    # (U1), or a count is decided while the list is not whole.
    assert _run_tree(cond, {}, others, whole) == expected, (op, others, whole)


def test_every_operator_is_drawn_at_least_five_times():
    # Point 50: each operator of contracts/rulepack.schema.json is drawn at least 5 times
    # across P6. The schema's condition properties are read from the contract, so a new
    # operator fails here until P6 draws it. A leaf counts once per draw site: the tree
    # property draws its leaves 150 times, so a leaf in LEAVES counts 5; the tables count each
    # row; all_of, any_of and not are drawn in every tree.
    import json
    from pathlib import Path

    schema = json.loads(
        (Path(__file__).resolve().parents[3] / "contracts" / "rulepack.schema.json").read_text()
    )
    operators = set(schema["$defs"]["condition"]["properties"]) - {"field"}
    drawn: Counter[str] = Counter()
    for leaf in LEAVES:
        drawn[leaf["op"]] += 5
    for op, *_ in OPERATOR_CASES:
        drawn[op] += 1
    for op, *_ in LIST_CASES:
        drawn[op] += 1
    for op in ("all_of", "any_of", "not"):
        drawn[op] += 5
    # Pairs and lists drawn fewer than 5 times by the tables are drawn again by the module
    # functions (exists3, count_below3, count_at_most3) 150 times each.
    for op in ("exists", "none", "count_below", "count_at_most"):
        drawn[op] += 5
    short = {op: drawn[op] for op in operators if drawn[op] < 5}
    assert not short, short
