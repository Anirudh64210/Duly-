"""Refuse only structure: specs/step-w/SPEC-W2-UNKNOWN.md point 39. The pack's structure faults
(an undeclared kind, field or fact, two records with one id, an id that does not match its
kind's prefix, more records of a kind than its max_records) answer 422 with the detail
CASE_STRUCTURE in its own plain words that never repeat what was sent. NOT_IN_THE_PACK is
retired. The schema's shape keeps first_problem's detail; a value that does not read is taken
in and asked (point 40), never refused.
"""

import copy
from datetime import UTC, datetime
from typing import Any

import pytest

from api.main import app, get_clock
from engine.clocks import FixedClock
from tests.support.api_client import CheckedClient

URL = "/v1/compute"
CLOCK = FixedClock(datetime(2026, 9, 29, 12, 0, tzinfo=UTC))
SECRET = "Quietname"


@pytest.fixture
def client() -> Any:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield CheckedClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def _case(*records: dict[str, Any], facts: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "categories": ["f1"],
        "time_zone": "UTC",
        "facts": dict(facts or {}),
        "records": list(records),
        "complete": {},
    }


def _p(rid: str = "p1", **fields: Any) -> dict[str, Any]:
    return {"id": rid, "kind": "program", "fields": {"level": "master", **fields}}


FAULTS = {
    "undeclared_kind": _case({"id": "v1", "kind": "vessel", "fields": {"name": SECRET}}),
    "undeclared_field": _case(_p(colour=SECRET)),
    "undeclared_fact": _case(_p(), facts={"secret_fact": SECRET}),
    "duplicate_id": _case(_p(school_name=SECRET), _p(school_name="Other")),
    # program ids start with p (the pack's id_prefix); a1 is an authorization id.
    "wrong_prefix": _case(_p("a1", school_name=SECRET)),
}


@pytest.mark.parametrize("fault", sorted(FAULTS))
def test_a_structure_fault_is_refused_with_case_structure_in_its_own_words(client, fault):
    # Point 39. Fails if the route answers 200 (path.py:137 lets a second w1 replace the
    # first), a 500, NOT_IN_THE_PACK, or a detail that repeats the sent value.
    from api.case import CASE_STRUCTURE

    res = client.post(URL, json=copy.deepcopy(FAULTS[fault]))
    assert res.status_code == 422
    assert res.json() == {"detail": CASE_STRUCTURE}
    assert SECRET not in res.text
    assert "vessel" not in res.text
    assert "colour" not in res.text


def test_more_records_than_max_records_is_a_structure_fault(client):
    # Point 39: more records of a kind than its max_records. The F-1 pack's limit is read from
    # the pack, so the case holds one more than it.
    from api.case import CASE_STRUCTURE
    from tests.support.w2_pack import f1_pack

    kinds = {k["id"]: k for k in (f1_pack().path or {})["records"]}
    limited = [k for k in kinds.values() if "max_records" in k]
    if not limited:
        pytest.fail("no kind of the F-1 pack declares max_records; point 39 needs one to test")
    kind = limited[0]
    records = [
        {"id": f"{kind['id_prefix']}{n}", "kind": kind["id"], "fields": {}}
        for n in range(1, kind["max_records"] + 2)
    ]
    res = client.post(URL, json=_case(*records))
    assert res.status_code == 422
    assert res.json() == {"detail": CASE_STRUCTURE}


def test_not_in_the_pack_is_retired():
    # Point 39: everything NOT_IN_THE_PACK meant is now CASE_STRUCTURE.
    import api.case

    assert not hasattr(api.case, "NOT_IN_THE_PACK")
    assert api.case.CASE_STRUCTURE.strip()


@pytest.mark.parametrize("value", ["forty", "2026-13-40", -1, 200000, True, "not_sure"], ids=repr)
def test_a_value_that_does_not_read_is_taken_in_never_refused(client, value):
    # Point 40 and 42: a typed value is read against its kind and asked, so one bad value
    # never withholds the whole case as a 422 would.
    body = _case(_p(start_date=value))
    res = client.post(URL, json=body)
    assert res.status_code == 200
    reasons = res.json()["verdict"]["reasons"]
    if value != "not_sure":
        assert "unreadable:p1.start_date" in reasons


def test_a_link_to_another_category_s_record_is_a_value_not_structure(client):
    # Point 39: a link to a record in another run is unreadable and asked, since the person
    # can fix it.
    body = _case(_p(), {"id": "a1", "kind": "authorization", "fields": {"program": "p7"}})
    res = client.post(URL, json=body)
    assert res.status_code == 200
    assert "unreadable:a1.program" in res.json()["verdict"]["reasons"]


def test_a_record_in_a_category_the_case_does_not_list_is_a_structure_fault(client):
    # Point 39, review w2-unknown finding 6: journey J06 with records[0].category "h1b", a
    # category the case's categories (["f1"]) do not list. The case schema takes it (a category
    # matches ^[a-z0-9]+$), so it is the pack's structure: 422 CASE_STRUCTURE, never a 500
    # (path.py:2036 raises a plain ValueError the route no longer catches). Fails if the route
    # answers 500 or 200.
    from api.case import CASE_STRUCTURE
    from tests.unit.acceptance.test_journeys import j06

    body = j06()
    assert "h1b" not in body["categories"]
    body["records"][0]["category"] = "h1b"
    res = client.post(URL, json=body)
    assert res.status_code == 422
    assert res.json() == {"detail": CASE_STRUCTURE}


def test_the_words_for_an_undeclared_category_name_the_category(client):
    # Review w2-unknown note 5, point 39: J06 with records[0].category "h1b", a category the
    # case does not list, gets 422 CASE_STRUCTURE (the test above). Its words list kind,
    # fields, id prefix, record counts and facts, never the category, which is the fault the
    # person has to change. They name the category (the word), and still never the sent value
    # "h1b" (point 39). Fails today: CASE_STRUCTURE has no "category".
    from api.case import CASE_STRUCTURE
    from tests.unit.acceptance.test_journeys import j06

    body = j06()
    body["records"][0]["category"] = "h1b"
    res = client.post(URL, json=body)
    assert res.status_code == 422
    assert res.json() == {"detail": CASE_STRUCTURE}
    assert "category" in res.json()["detail"]
    assert "h1b" not in res.text
