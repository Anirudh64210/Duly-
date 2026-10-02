"""What absence means, in the shipped F-1 pack's data: specs/step-w/SPEC-W2-UNKNOWN.md points 2,
2a and 14, with the list of point 61 as DECISIONS.md D92 accepted it ("A trip with no return
date is asked, not assumed": trip.returned_on stays ask). Pack data only: no engine name.

- Every field whose when_absent is not ask is named in the pack CHANGELOG with the screen
  words that make leaving it empty the person's statement (point 2).
- Every field read under present: false, as a chain_link, or through an optional member of
  earliest_of or latest_of declares none or not_yet (point 2: a field the person could never
  answer "none" to would wait for good).
- Every kind a history, a first or a count reads carries a complete_label (point 14).

The CHANGELOG form checked: one line that names `<kind>.<field>`, the word when_absent, and the
screen words in double quotes. That form is this test's; the SPEC asks only that the words be
there (see tests/REPORT.json).
"""

import re
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from tests.support.w2_pack import F1_DIR, f1_pack

PACK = f1_pack()
PATH: dict[str, Any] = PACK.path or {}
KINDS = {k["id"]: k for k in PATH["records"]}
FIELDS = {(k["id"], f["id"]): f for k in PATH["records"] for f in k["fields"]}
CHANGELOG = (F1_DIR / "CHANGELOG.md").read_text()

NO_DECISION_YET = {
    "any_of": [
        {"field": "this.decision", "present": False},
        {"field": "this.decision", "in": ["pending"]},
    ]
}
NOT_STEM = {"field": "this.type", "in": ["stem_extension"]}

# Point 61 as D92 accepted it.
NOT_YET = [
    ("work", "end"),
    ("authorization", "filed_on"),
    ("authorization", "decision"),
    ("move", "registered_on"),
    ("move", "release_date"),
    ("move", "contacted_new_dso_on"),
    ("report", "made_on"),
]
NONE = [
    ("work", "on_campus"),
    ("authorization", "extends"),
    ("petition", "outcome"),
    ("petition", "validity_start"),
    ("petition", "requested_start"),
]
CARD_DATES = [("authorization", "card_start"), ("authorization", "card_end")]
NONE_BUT_ON_STEM = [("authorization", "employer"), ("authorization", "basis_program")]
ASKED = [
    ("trip", "returned_on"),
    ("work", "under"),
    ("program", "start_date"),
    ("program", "level"),
]


def _absence(kind: str, field: str) -> Any:
    return FIELDS[(kind, field)].get("when_absent", "ask")


@pytest.mark.parametrize(("kind", "field"), NOT_YET)
def test_point_61_these_fields_are_not_yet_when_left_empty(kind, field):
    # Fails if the pack leaves the field ask (a job end left empty would be asked, though the
    # screen says "Leave empty if you still work there") or declares none (U20).
    assert _absence(kind, field) == "not_yet"


@pytest.mark.parametrize(("kind", "field"), NONE)
def test_point_61_these_fields_are_none_when_left_empty(kind, field):
    assert _absence(kind, field) == "none"


@pytest.mark.parametrize(("kind", "field"), CARD_DATES)
def test_point_61_card_dates_are_not_yet_only_while_no_decision_has_come(kind, field):
    # Point 2a and 61: {not_yet: [any_of decision absent, decision pending], else: ask}.
    declared = _absence(kind, field)
    assert isinstance(declared, dict)
    assert declared.get("not_yet") == [NO_DECISION_YET]
    assert declared.get("else", "ask") == "ask"
    assert "none" not in declared


@pytest.mark.parametrize(("kind", "field"), NONE_BUT_ON_STEM)
def test_point_61_employer_and_basis_program_are_none_on_every_type_but_stem(kind, field):
    # Point 61: none on every type but stem_extension, else ask. Written as a none list that
    # holds on the other types: not (type in stem_extension).
    declared = _absence(kind, field)
    assert isinstance(declared, dict)
    assert declared.get("none") == [{"not": NOT_STEM}]
    assert declared.get("else", "ask") == "ask"


@pytest.mark.parametrize(("kind", "field"), ASKED)
def test_point_61_everything_else_is_asked(kind, field):
    # D92: a trip with no return date is asked; work.under, program dates and levels stay ask.
    assert _absence(kind, field) == "ask"


def _declared() -> list[tuple[str, str]]:
    return sorted(key for key, f in FIELDS.items() if f.get("when_absent", "ask") != "ask")


def test_point_2_every_declared_absence_is_in_the_changelog_with_its_screen_words():
    # Point 2: "The screen words the empty field from the same declaration ... so leaving it
    # empty is the person's statement." Fails if a field declares none or not_yet and the
    # CHANGELOG gives no words for it.
    missing = []
    for kind, field in _declared():
        line = re.compile(rf"^.*\b{kind}\.{field}\b.*\bwhen_absent\b.*\"[^\"]+\".*$", re.MULTILINE)
        if not line.search(CHANGELOG):
            missing.append(f"{kind}.{field}")
    assert _declared(), "the pack declares no absence"
    assert not missing, missing


# Walking the pack with the record kind in scope.


def _link_kind(kind: str, field: str) -> str | None:
    decl = FIELDS.get((kind, field))
    if decl is None or decl["kind"] != "link":
        return None
    return str(decl["to"][0])


def _resolve(path: str, this: str | None, outer: str | None) -> tuple[str, str] | None:
    """(kind, field) a path ends on, or None for an id, today, a fact or a kind not known."""
    head, *rest = path.split(".")
    kind = {"this": this, "outer": outer}.get(head)
    if kind is None or not rest:
        return None
    for step in rest[:-1]:
        nxt = _link_kind(kind, step)
        if nxt is None:
            return None
        kind = nxt
    if rest[-1] == "id":
        return None
    return (kind, rest[-1])


def _walk(node: Any, this: str | None, outer: str | None) -> Iterator[tuple[str, Any, Any, Any]]:
    """(what, node, this, outer) for each condition and when in the pack, with scope."""
    if isinstance(node, list):
        for child in node:
            yield from _walk(child, this, outer)
        return
    if not isinstance(node, dict):
        return
    yield ("node", node, this, outer)
    for key, child in node.items():
        selects = key in ("of", "exists", "none", "for_each", "qualifying", "not_qualifying")
        if selects and isinstance(child, dict) and "record" in child:
            yield from _walk(child.get("where", []), child["record"], this)
        elif key == "scope" and isinstance(child, dict):
            yield from _walk(child.get("of", {}).get("where", []), child["of"]["record"], this)
        elif key == "where":
            continue
        else:
            yield from _walk(child, this, outer)


def _scoped() -> Iterator[tuple[str, Any, Any, Any]]:
    for group in ("stages", "checks", "counters"):
        for item in PATH.get(group, []):
            kind = None
            if "for_each" in item:
                kind = item["for_each"]["record"]
            elif "scope" in item:
                kind = item["scope"]["of"]["record"]
            yield from _walk(item, kind, None)


def _must_declare() -> set[tuple[str, str]]:
    found: set[tuple[str, str]] = set()
    for _, node, this, outer in _scoped():
        if node.get("present") is False and "field" in node:
            hit = _resolve(node["field"], this, outer)
            if hit:
                found.add(hit)
        for key in ("earliest_of", "latest_of"):
            for member in node.get(key, []):
                if member.get("optional") and "fact" in member:
                    hit = _resolve(member["fact"], this, outer)
                    if hit:
                        found.add(hit)
    for counter in PATH.get("counters", []):
        link = counter["scope"].get("chain_link")
        if link:
            found.add((counter["scope"]["of"]["record"], link))
    return found


def test_point_2_a_field_read_as_absent_declares_none_or_not_yet():
    # Point 2: every field read under present: false, as a chain_link, or through an optional
    # member of earliest_of or latest_of declares none or not_yet (a conditional declaration
    # counts when one of its lists gives none or not_yet). Fails if such a field is ask: the
    # read could never be F or N, so the output would wait for good.
    wrong = []
    # D92 decides trip.returned_on stays ask ("A trip with no return date is asked, not
    # assumed"), though the pack reads it under present: false. DECISIONS.md wins over the SPEC
    # (CLAUDE.md); the conflict is under disputes in tests/REPORT.json for the founder.
    for kind, field in sorted(_must_declare() - {("trip", "returned_on")}):
        declared = _absence(kind, field)
        ok = declared in ("none", "not_yet") or (
            isinstance(declared, dict) and ("none" in declared or "not_yet" in declared)
        )
        if not ok:
            wrong.append(f"{kind}.{field}")
    assert _must_declare(), "the walk found nothing: the walker is broken"
    assert not wrong, wrong


def _kinds_read_as_lists() -> set[str]:
    found: set[str] = set()
    for _, node, _this, _outer in _scoped():
        if "first" in node:
            found.add(node["first"]["of"]["record"])
        for key in ("count_below", "count_at_most"):
            if key in node:
                found.add(node[key]["of"]["record"])
    for counter in PATH.get("counters", []):
        found.add(counter["scope"]["of"]["record"])
        for key in ("qualifying", "not_qualifying"):
            if key in counter:
                found.add(counter[key]["record"])
    for decl in FIELDS.values():
        if "history" in decl:
            found.add(decl["history"]["record"])
    return found


def test_point_14_every_kind_a_history_a_first_or_a_count_reads_has_a_complete_label():
    # Point 14: "Every kind a history, a first or a count reads carries a complete_label, so the
    # screen can ask it (L-content adds the missing ones, e.g. end_date_change)." Fails today
    # on end_date_change.
    kinds = _kinds_read_as_lists()
    assert "end_date_change" in kinds  # the history of program.end_date
    missing = sorted(k for k in kinds if not KINDS[k].get("complete_label"))
    assert not missing, missing


def test_the_changelog_is_the_pack_s_own():
    assert Path(F1_DIR / "CHANGELOG.md").exists()
