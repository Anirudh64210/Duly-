"""Holdout: W2-P2 journey pairs (specs/step-w/SPEC-W2.md points 45, 46 and 50; G8, G9, G10,
G17; D74), each a pair on either side of the line it turns on, sent through POST /v1/compute as
the journeys are. Never shown to the building lanes. Today is 2026-09-29 in America/New_York
through an injected FixedClock; each date is worked by hand beside its assertion. The numbers
are the saved words' (tests/unit/engine/test_w2_records.py pins them): 10 days from (f)(17),
five months from (f)(4), six months from (f)(13)(ii); 30 days for watch.close_days and
checkin.job_days (K1). The new kinds' prefixes and date fields are the pack's declarations.
"""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock  # type: ignore[attr-defined]
from tests.support.api_client import CheckedClient
from tests.support.records_case import CLOCK, case, rec, whole
from tests.support.w2_pack import f1_pack


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield CheckedClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def _path() -> dict[str, Any]:
    path = f1_pack().path
    assert path is not None
    return path


def _send(client: TestClient, records: list[dict[str, Any]]) -> dict[str, Any]:
    kinds = [r["id"] for r in _path()["records"]]
    res = client.post("/v1/compute", json=case(records, whole(*kinds)))
    assert res.status_code == 200, res.text
    out: dict[str, Any] = res.json()
    return out


def _decl(kind: str) -> dict[str, Any]:
    found: list[dict[str, Any]] = [r for r in _path()["records"] if r["id"] == kind]
    assert len(found) == 1, kind
    return found[0]


def _watched(kind: str) -> str:
    found = [w["field"] for w in _path().get("watch", []) if w["record"] == kind]
    assert len(found) == 1, kind
    field: str = found[0]
    return field


def _address_field() -> str:
    """The address field the (f)(17) report window is dated from."""
    rules = {p["id"] for p in f1_pack().parameters if "214.2(f)(17)" in p["source"]["citation"]}
    found = [
        w["closes"]["fact"].removeprefix("this.")
        for s in _path()["stages"]
        if s.get("for_each", {}).get("record") == "address"
        for w in s.get("windows", [])
        if any(a.get("rule") in rules for a in w.get("closes", {}).get("add", []))
    ]
    assert len(found) == 1, found
    field: str = found[0]
    return field


def _windows(out: dict[str, Any], prefix: str) -> list[dict[str, Any]]:
    return [w for s in out["stages"] for w in s["windows"] if w["id"].startswith(prefix)]


def _on_opt(*more: dict[str, Any]) -> list[dict[str, Any]]:
    """Program end 2026-05-15; OPT card 2026-06-01 to 2027-05-31; employer e1."""
    program = rec(
        "p1",
        "program",
        where="us_on_f1",
        level="bachelor",
        stem_list="not_on_list",
        end_date="2026-05-15",
        state="completed",
    )
    card = rec(
        "a1",
        "authorization",
        type="opt_post_completion",
        program="p1",
        decision="approved",
        dso_on="2026-04-01",
        filed_on="2026-04-10",
        card_start="2026-06-01",
        card_end="2027-05-31",
    )
    return [program, card, rec("e1", "employer", name="Employer One"), *more]


def _job(**extra: Any) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "employer": "e1",
        "under": "a1",
        "start": "2026-07-01",
        "hours_per_week": 40,
    }
    fields.update(extra)
    return rec("w1", "work", **fields)


# G17: moved 2026-09-20, reported within 10 days: 10 more reach 2026-09-30. Moved 2026-09-21:
# 9 reach Sep 30, one more 2026-10-01.


@pytest.mark.parametrize(
    ("moved", "closes"), [("2026-09-20", "2026-09-30"), ("2026-09-21", "2026-10-01")]
)
def test_address_report_either_side_of_a_month_end(
    client: TestClient, moved: str, closes: str
) -> None:
    # A move is a second address linked to the one it left: the first address on the record
    # is no change and owes no report (the pack's address.previous is when_absent none).
    field = _address_field()
    prefix = _decl("address")["id_prefix"]
    link = next(
        f["id"]
        for f in _decl("address")["fields"]
        if f["kind"] == "link" and f.get("to") == ["address"]
    )
    first = rec(f"{prefix}1", "address", **{field: "2025-08-15"})
    moved_rec = rec(f"{prefix}2", "address", **{field: moved, link: first["id"]})
    out = _send(client, _on_opt(_job(confirmed_on="2026-09-29"), first, moved_rec))
    dated = [
        w["closes"]
        for s in out["stages"]
        for w in s["windows"]
        if w.get("record") == moved_rec["id"] and w["closes"] is not None
    ]
    assert dated == [closes]


# G9: left 2026-09-27, five months on: 2027-02-27. Left 2026-09-29: Feb 29 is not in 2027,
# so the month's last day, 2027-02-28.


@pytest.mark.parametrize(
    ("left", "closes"), [("2026-09-27", "2027-02-27"), ("2026-09-29", "2027-02-28")]
)
def test_absence_limit_either_side_of_the_end_of_february(
    client: TestClient, left: str, closes: str
) -> None:
    trip = rec("t1", "trip", left_on=left, signature_on="2026-06-15")
    out = _send(client, _on_opt(_job(confirmed_on="2026-09-29"), trip))
    assert [w["closes"] for w in _windows(out, "trip.absence_limit.")] == [closes]


# G9: signature 2026-03-29, six months on: 2026-09-29. Signature 2026-03-31: Sep 31 does not
# exist, so 2026-09-30.


@pytest.mark.parametrize(
    ("signed", "closes"), [("2026-03-29", "2026-09-29"), ("2026-03-31", "2026-09-30")]
)
def test_signature_covers_either_side_of_a_short_month(
    client: TestClient, signed: str, closes: str
) -> None:
    trip = rec("t1", "trip", left_on="2026-09-20", signature_on=signed)
    out = _send(client, _on_opt(_job(confirmed_on="2026-09-29"), trip))
    assert [w["closes"] for w in _windows(out, "trip.signature_covers.")] == [closes]


# G10: today 2026-09-29. A passport ending 2026-10-29 is 30 days away (1 to Sep 30, 29 more),
# at watch.close_days: close. Ending 2026-10-30: 31, not close.


@pytest.mark.parametrize(
    ("ends", "days", "close"), [("2026-10-29", 30, True), ("2026-10-30", 31, False)]
)
def test_watch_close_either_side_of_the_setting(
    client: TestClient, ends: str, days: int, close: bool
) -> None:
    passport = rec(f"{_decl('passport')['id_prefix']}1", "passport", **{_watched("passport"): ends})
    out = _send(client, _on_opt(_job(confirmed_on="2026-09-29"), passport))
    got = [
        (w["date"], w["days_away"], w["close"])
        for w in out.get("watch", [])
        if w["record"] == passport["id"]
    ]
    assert got == [(ends, days, close)]


# G8: confirmed 2026-08-30; 30 days on: 1 reaches Aug 31, 29 more 2026-09-29, today: due, 0
# away, its question open. Confirmed 2026-08-31: 2026-09-30, one away, not open. Either way
# the count is June's 30 days, as of the confirmed day.


@pytest.mark.parametrize(
    ("confirmed", "due", "away", "open_"),
    [("2026-08-30", "2026-09-29", 0, True), ("2026-08-31", "2026-09-30", 1, False)],
)
def test_check_in_either_side_of_its_due_day(
    client: TestClient, confirmed: str, due: str, away: int, open_: bool
) -> None:
    out = _send(client, _on_opt(_job(confirmed_on=confirmed)))
    found = [c for c in out.get("checkins", []) if c["record"] == "w1"]
    assert [(c["due"], c["due_days_away"]) for c in found] == [(due, away)]
    assert (found[0]["question"] in {q["id"] for q in out["questions"]}) is open_
    count = [i for i in out["computed"] if i["id"] == "unemployment.opt_card.a1"]
    assert [(i["value"], i.get("as_of")) for i in count] == [(30, confirmed)]


# reviews/w2-p1.md finding 1: 40 hours counts June's 30 days; -40 is unreadable, asked, and
# the count waits on it.


@pytest.mark.parametrize(("hours", "value"), [(40, 30), (-40, None)])
def test_hours_either_side_of_zero(client: TestClient, hours: int, value: int | None) -> None:
    out = _send(client, _on_opt(_job(hours_per_week=hours, confirmed_on="2026-09-29")))
    count = [i for i in out["computed"] if i["id"] == "unemployment.opt_card.a1"]
    assert [i["value"] for i in count] == [value]
    asked = [q.get("state") for q in out["questions"] if q["id"] == "w1.hours_per_week"]
    assert asked == ([] if value is not None else ["unreadable"])
