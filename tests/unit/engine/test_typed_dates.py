"""Typed dates: ask once, verify, then trust or say cannot_tell (D59).

Specified in specs/documents-1/SPEC.md section 8, "Typed dates": a date whose only source
is the person's typing is used for a verdict only when (1) typed_dates.from_documents is
answered yes, with about holding every typed date; (2) each typed date is checked by the
question typed_dates.checked.<fact>, answered "Matches" (a "Doesn't match" or no answer is
not checked); (3) nothing contradicts it. Otherwise cannot_tell with unconfirmed:typed_dates;
with no typed date checked and no confirmed document, the reason stays no_documents.
PRINCIPLES and CLAUDE.md: a verdict never falls back to the quiet state while unchecked.

The case is a records case over the small j1 pack of test_path.py, run through
engine.path.compute (see that file for the assumed signature). Every date in it is typed:
the case holds no document. For a record field, <fact> is <record id>.<field>, the name
programs.md section 21 point 6 gives a record field; this is this lane's reading and is
listed under requests in tests/REPORT.json.

Expected to fail until the build round.
"""

from datetime import date
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from tests.unit.engine import test_path as toy

FROM_DOCUMENTS = "typed_dates.from_documents"
CHECKED = "typed_dates.checked."
ON = toy.TODAY.isoformat()

# One course whose span holds today (2026-09-29), with every list stated whole, so the
# only open matter is the typed dates. Its typed dates: c1.start, c1.end, c1.done_on.
COURSE = toy._rec(
    "c1", "course", start="2025-01-06", end="2026-10-20", level="high", done_on="2026-09-01"
)
TYPED = ("c1.start", "c1.end", "c1.done_on")


def _out(confirmations: dict[str, Any] | None, today: date = toy.TODAY) -> dict[str, Any]:
    return toy._compute(toy._case([COURSE], confirmations=confirmations), toy._pack(), today)


def _asked(out: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {q["id"]: q for q in out["questions"]}


def _yes_from_documents(out: dict[str, Any]) -> dict[str, Any]:
    about = _asked(out)[FROM_DOCUMENTS].get("about", {})
    return {FROM_DOCUMENTS: {"answer": True, "on": ON, "about": about}}


def _checked(fact: str, answer: bool = True) -> dict[str, Any]:
    return {CHECKED + fact: {"answer": answer, "on": ON}}


def test_unanswered_typed_dates_ask_whether_they_came_from_documents() -> None:
    out = _out(None)
    assert FROM_DOCUMENTS in _asked(out)
    assert out["verdict"]["state"] == "cannot_tell"


def test_the_from_documents_question_carries_every_typed_date_in_its_about() -> None:
    # Section 8 point 1: "with about holding every typed date". The values are the ones in
    # COURSE: 2025-01-06, 2026-10-20, 2026-09-01.
    about = _asked(_out(None))[FROM_DOCUMENTS].get("about", {})
    held = {str(v) for v in about.values()}
    assert {"2025-01-06", "2026-10-20", "2026-09-01"} <= held


def test_with_no_document_and_nothing_checked_the_reason_stays_no_documents() -> None:
    out = _out(None)
    assert "no_documents" in out["verdict"]["reasons"]


def test_a_yes_to_from_documents_asks_to_check_each_typed_date() -> None:
    out = _out(_yes_from_documents(_out(None)))
    asked = _asked(out)
    for fact in TYPED:
        assert CHECKED + fact in asked


def test_a_yes_to_from_documents_alone_is_cannot_tell_with_unconfirmed_typed_dates() -> None:
    out = _out(_yes_from_documents(_out(None)))
    assert out["verdict"]["state"] == "cannot_tell"
    assert "unconfirmed:typed_dates" in out["verdict"]["reasons"]


def test_one_date_left_unchecked_is_cannot_tell() -> None:
    conf = _yes_from_documents(_out(None)) | _checked("c1.start") | _checked("c1.end")
    out = _out(conf)
    assert "unconfirmed:typed_dates" in out["verdict"]["reasons"]
    assert CHECKED + "c1.done_on" in _asked(out)


def test_a_date_that_does_not_match_is_not_checked() -> None:
    conf = (
        _yes_from_documents(_out(None))
        | _checked("c1.start")
        | _checked("c1.end", answer=False)
        | _checked("c1.done_on")
    )
    out = _out(conf)
    assert out["verdict"]["state"] == "cannot_tell"
    assert "unconfirmed:typed_dates" in out["verdict"]["reasons"]


def test_every_date_checked_lifts_both_reasons() -> None:
    conf = _yes_from_documents(_out(None))
    for fact in TYPED:
        conf |= _checked(fact)
    out = _out(conf)
    assert "unconfirmed:typed_dates" not in out["verdict"]["reasons"]
    assert "no_documents" not in out["verdict"]["reasons"]
    assert [q for q in out["questions"] if q["id"].startswith("typed_dates.")] == []


def test_checks_without_the_from_documents_yes_do_not_count() -> None:
    # Point 1 comes first: every date "Matches", but from_documents is not answered.
    conf: dict[str, Any] = {}
    for fact in TYPED:
        conf |= _checked(fact)
    out = _out(conf)
    assert out["verdict"]["state"] == "cannot_tell"
    assert FROM_DOCUMENTS in _asked(out)


def test_a_no_to_from_documents_is_cannot_tell() -> None:
    about = _asked(_out(None))[FROM_DOCUMENTS].get("about", {})
    out = _out({FROM_DOCUMENTS: {"answer": False, "on": ON, "about": about}})
    assert out["verdict"]["state"] == "cannot_tell"


def test_a_yes_given_for_other_dates_is_not_read() -> None:
    # product-1: an answer is taken only with the about of the question it answers. A yes
    # whose about holds an older end date is not a yes for 2026-10-20.
    about = dict(_asked(_out(None))[FROM_DOCUMENTS].get("about", {}))
    for key, value in about.items():
        if value == "2026-10-20":
            about[key] = "2026-05-15"
    conf: dict[str, Any] = {FROM_DOCUMENTS: {"answer": True, "on": ON, "about": about}}
    for fact in TYPED:
        conf |= _checked(fact)
    out = _out(conf)
    assert FROM_DOCUMENTS in _asked(out)


@settings(max_examples=30, deadline=None)
@given(
    st.sets(st.sampled_from(TYPED), max_size=len(TYPED) - 1),
    st.dates(min_value=date(2025, 1, 6), max_value=date(2026, 10, 19)),
)
def test_never_quiet_while_a_typed_date_is_unchecked(checked: set[str], today: date) -> None:
    # Any day inside c1's span, any strict subset of the dates checked: never no_open_items.
    on = toy.TODAY if today >= toy.TODAY else today
    first = toy._compute(toy._case([COURSE]), toy._pack(), today)
    about = _asked(first).get(FROM_DOCUMENTS, {}).get("about", {})
    conf: dict[str, Any] = {FROM_DOCUMENTS: {"answer": True, "on": on.isoformat(), "about": about}}
    for fact in checked:
        conf[CHECKED + fact] = {"answer": True, "on": on.isoformat()}
    out = toy._compute(toy._case([COURSE], confirmations=conf), toy._pack(), today)
    assert out["verdict"]["state"] != "no_open_items"
