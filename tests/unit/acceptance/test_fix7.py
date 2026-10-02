"""Resolutions points 22 to 26 (review fix6), each sent through POST /v1/compute.

Specified in specs/product-2/resolutions.md points 22 to 26, answering the findings of
reviews/product-2-fix6.md, and point 23a (the period a petition would extend, the start
used, the Timeline mark), answering this lane's escalation. The journeys are the cases of
test_journeys.py (specs/path-1/journeys.json), with a change-of-status petition added or a
date moved where a point needs it. Today is 2026-09-29 in America/New_York, through the
injected FixedClock of tests/support/records_case.py. Every expected date is worked out by
hand beside its assertion.

Point 25 names the pack mutants these tests must kill (reviews/product-2-fix6.md finding 4).
Each test says which mutant it kills, as "Kills:". The names carry the point, so a build lane
can select its own: "point_22" and "unknown_choice" are the engine's (plan-fix7, L-engine);
every other test is the pack's (L-content).

Not expected to pass before the build round of plan-fix7.
"""

import re
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock  # type: ignore[attr-defined]
from tests.support.api_client import CheckedClient
from tests.support.records_case import (
    CLOCK,
    question_ids,
    reasons,
    rec,
    stage,
    whole,
    window,
)
from tests.unit.acceptance import test_journeys as journeys

URL = "/v1/compute"
STEP_BACK = journeys.STEP_BACK
LATE_FILING = "conflict:stem.filed_while_opt_in_force.a2"


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield CheckedClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def _send(client: TestClient, body: dict[str, Any]) -> dict[str, Any]:
    res = client.post(URL, json=body)
    assert res.status_code == 200, res.text
    out: dict[str, Any] = res.json()
    return out


def _set(body: dict[str, Any], record_id: str, **fields: Any) -> dict[str, Any]:
    """The case with these fields of one record changed."""
    for record in body["records"]:
        if record["id"] == record_id:
            record["fields"].update(fields)
            return body
    raise AssertionError(f"no record {record_id}")


def _with_petition(body: dict[str, Any], **fields: Any) -> dict[str, Any]:
    """The case with a change-of-status petition h9 from employer e9, the petition list whole."""
    body["records"] += [
        rec("e9", "employer", name="Employer Nine"),
        rec("h9", "petition", employer="e9", change_of_status="yes", **fields),
    ]
    body["complete"].update(whole("petition"))
    return body


def _field(out: dict[str, Any], qid: str) -> Any:
    """The field a question asks (SPEC-W2-UNKNOWN point 34), or None if it is not asked."""
    return next((q.get("field") for q in out["questions"] if q["id"] == qid), None)


def _current(out: dict[str, Any]) -> list[str]:
    return [s["id"] for s in out["stages"] if s["state"] == "current"]


def _undated_current(out: dict[str, Any]) -> list[str]:
    """Stages the engine calls current that hold neither a start nor an end."""
    return [
        s["id"]
        for s in out["stages"]
        if s["state"] == "current" and s["starts"] is None and s["ends"] is None
    ]


# Point 22: "When point 19 makes a stage's start and end null, the stage's state is `unknown`
# (contracts/engine_output.schema.json). An `unknown` stage is never the first current stage
# ... A stage that has its own dates keeps its state as before (J19's stem.a2 stays current)."
# In J12, J13 and J14 every field the path reads is given, so a stage with no start and no end
# is one point 19 nulled. The fix6 run gave grace.p1 state current, starts null, ends null for
# all three (finding 1). Point 22b widens the first line (start or end null is unknown) and
# puts cap_gap.for_dso on a stage's own reasons only when a petition nulled it; the stage
# reasons are pinned in test_fix8.py, and the dates and states here stand as they were.


def test_point_22_j12_the_grace_the_petition_nulls_is_unknown(client: TestClient) -> None:
    # J12: a1 2025-06-01 to 2026-05-31, h1 filed 2026-04-01, approved, validity_start
    # 2026-10-01. The grace of p1 is null (test_j12_the_grace_it_could_follow_is_null).
    # Kills: the engine's fall-back of a stage with no start and no end to "current"
    # (engine/path.py, fix6 finding 1).
    out = _send(client, journeys.j12())
    grace = stage(out, "grace.p1")
    assert (grace["starts"], grace["ends"]) == (None, None)
    assert grace["state"] == "unknown"


def test_point_22_j12_has_no_current_stage(client: TestClient) -> None:
    # J12 on 2026-09-29: opt_post.a1 ended 2026-05-31 (done), p1 has no start_date so no
    # program stage, and grace.p1 is unknown. So no stage is current, and Home's eyebrow names
    # none. Kills: an unknown stage counted as current, or a done card read as current.
    out = _send(client, journeys.j12())
    assert _current(out) == []


def test_point_22_j13_the_grace_the_petition_nulls_is_unknown(client: TestClient) -> None:
    # J13: a1 2025-07-01 to 2026-06-30, h1 filed 2026-04-01, denied. Without h1 the grace
    # would be 2026-07-01 to 2026-08-29; with it, null. Kills: the "current" fall-back.
    out = _send(client, journeys.j13())
    grace = stage(out, "grace.p1")
    assert (grace["starts"], grace["ends"]) == (None, None)
    assert grace["state"] == "unknown"
    assert _undated_current(out) == []


def test_point_22_j14_the_grace_the_petition_nulls_is_unknown(client: TestClient) -> None:
    # J14: a2 (STEM) 2024-06-01 to 2026-05-31, h1 filed 2026-04-01, withdrawn. The grace of p1
    # follows a2 and is null. Kills: the "current" fall-back.
    out = _send(client, journeys.j14())
    grace = stage(out, "grace.p1")
    assert (grace["starts"], grace["ends"]) == (None, None)
    assert grace["state"] == "unknown"
    assert _undated_current(out) == []


def _j19_petition_for_a2() -> dict[str, Any]:
    # A petition a2 can be extended by (point 23): filed 2026-04-01 while a1 ran, approved
    # 2026-06-20, validity_start 2026-10-01, on or after a2's start 2026-06-09.
    return _with_petition(
        journeys.j19(),
        type="h1b",
        cap_subject="yes",
        filed_on="2026-04-01",
        requested_start="2026-10-01",
        outcome="approved",
        outcome_on="2026-06-20",
        validity_start="2026-10-01",
    )


def test_point_22_j19_stem_keeps_its_own_dates_and_stays_the_only_current_stage(
    client: TestClient,
) -> None:
    # J19's a2 runs 2026-06-09 to 2028-06-08, so on 2026-09-29 it is current, petition or not.
    # grace.p2 (2028-06-09 to 2028-08-07 without the petition) is null by point 19 and so
    # unknown. The fix6 run marked two stages "now": stem.a2 and grace.p2.
    # Kills: the "current" fall-back; and a change that turns every stage unknown whenever a
    # petition is entered (stem.a2 has its own dates and keeps its state).
    out = _send(client, _j19_petition_for_a2())
    stem = stage(out, "stem.a2")
    assert (stem["starts"], stem["ends"], stem["state"]) == ("2026-06-09", "2028-06-08", "current")
    grace = stage(out, "grace.p2")
    assert (grace["starts"], grace["ends"], grace["state"]) == (None, None, "unknown")
    assert _current(out) == ["stem.a2"]


def test_point_22_j19_without_a_petition_the_grace_is_later_not_unknown(
    client: TestClient,
) -> None:
    # The other side: plain J19, grace.p2 has its dates. a2's card_end 2028-06-08 plus 60 days:
    # June 9 to 30 is 22, July 31 more is 53, August 1 to 7 is 60 -> 2028-06-09 to 2028-08-07,
    # after today, so later. Kills: unknown given to a stage point 19 did not null.
    # Point 22b: a case with no petition carries cap_gap.for_dso on no stage.
    # Kills also: the step-back reason put on a stage no petition nulled.
    out = _send(client, journeys.j19())
    grace = stage(out, "grace.p2")
    assert (grace["starts"], grace["ends"], grace["state"]) == ("2028-06-09", "2028-08-07", "later")
    assert [s["id"] for s in out["stages"] if STEP_BACK in (s.get("reasons") or [])] == []


# Point 23: "A petition whose start (validity_start when approved, else requested_start) falls
# before a card's start cannot extend that card, so point 19 does not step back for that card
# and nothing is taken away from it: its conflicts and questions (for example
# conflict:stem.filed_while_opt_in_force and a2.filed_on) stay." The late-filing check reads
# a2 against the card it extends, a1 (2025-06-09 to 2026-06-08). In the J19 twin below a2 is
# filed 2026-07-20, after a1's end, so without a petition the conflict is raised (fix6
# finding 2's input).


def _j19_late(**petition: Any) -> dict[str, Any]:
    body = _set(journeys.j19(), "a2", filed_on="2026-07-20")
    return _with_petition(body, **petition) if petition else body


def test_point_23_the_late_stem_filing_is_a_conflict_without_a_petition(
    client: TestClient,
) -> None:
    # The control for the tests below: a2 filed 2026-07-20 is after a1's card_end 2026-06-08.
    # Kills: a late-filing check that no longer fires at all (then the tests below would pass
    # for the wrong reason).
    out = _send(client, _j19_late())
    assert LATE_FILING in reasons(out)


def test_point_23_a_2020_petition_keeps_j19s_late_filing_conflict(client: TestClient) -> None:
    # Fix6 finding 2: h1b filed 2020-04-01, approved 2020-06-01, validity_start 2020-10-01.
    # 2020-10-01 is before a1's start 2025-06-09, so it cannot extend a1.
    # Kills (point 25): the point 23 skip removed in this direction, i.e. any petition hides
    # stem.filed_while_opt_in_force (parameters.yaml only_if: none petition).
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2020-04-01",
            requested_start="2020-10-01",
            outcome="approved",
            outcome_on="2020-06-01",
            validity_start="2020-10-01",
        ),
    )
    assert LATE_FILING in reasons(out)


def test_point_23_a_2020_petition_leaves_j19s_questions_asked(client: TestClient) -> None:
    # Plain J19 gives no a2.filed_on. The same 2020 petition cannot extend a1 or a2, so its
    # questions stay (point 23). The fix6 run stopped asking one.
    # D92 (SPEC-W2-UNKNOWN point 61, accepted as written): authorization.filed_on is not_yet,
    # so an empty a2.filed_on reads "not filed yet" and is no longer asked; the question it fed
    # is now the late-filing conflict's own, stem.filed_while_opt_in_force.a2. So the test asks
    # that the petition takes no question away from plain J19, that one included.
    # Kills (point 25): the point 23 skip removed, any petition dropping a question.
    plain = question_ids(_send(client, journeys.j19()))
    assert "stem.filed_while_opt_in_force.a2" in plain
    out = _send(
        client,
        _with_petition(
            journeys.j19(),
            type="h1b",
            cap_subject="yes",
            filed_on="2020-04-01",
            requested_start="2020-10-01",
            outcome="approved",
            outcome_on="2020-06-01",
            validity_start="2020-10-01",
        ),
    )
    assert sorted(set(plain) - set(question_ids(out))) == []  # D92


def test_point_23_a_2020_petition_takes_no_report_from_a2(client: TestClient) -> None:
    # "nothing is taken away from it": the 2020 petition starts before a2's start 2026-06-09.
    # a2 starts 2026-06-09; plus 6 months is 2026-12-09, a Wednesday; plus 10 business days:
    # Dec 10, 11, 14, 15, 16, 17, 18, 21, 22, 23 -> 2026-12-23. The fix6 run nulled it.
    # Kills (point 25): the point 23 skip removed from the validation members.
    out = _send(
        client,
        _with_petition(
            journeys.j19(),
            type="h1b",
            cap_subject="yes",
            filed_on="2020-04-01",
            requested_start="2020-10-01",
            outcome="approved",
            outcome_on="2020-06-01",
            validity_start="2020-10-01",
        ),
    )
    assert window(out, "stem.validation_1.a2") == ("2026-12-09", "2026-12-23")


def test_point_23_a_petition_starting_after_the_card_start_steps_back(client: TestClient) -> None:
    # validity_start 2026-10-01 is after a1's start 2025-06-09 and a2's start 2026-06-09, so
    # it could extend either: point 19 steps back. The late-filing conflict is skipped (a1
    # may have been extended), cap_gap.for_dso is given, and every a2 report due on or after
    # the filing 2026-04-01 is null: validation_1 would close 2026-12-23 (worked above).
    # Kills (point 25): the point 23 skip in the other direction, a petition that starts
    # after the card start treated as unable to extend it.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2026-04-01",
            requested_start="2026-10-01",
            outcome="approved",
            outcome_on="2026-06-20",
            validity_start="2026-10-01",
        ),
    )
    assert STEP_BACK in reasons(out)
    assert LATE_FILING not in reasons(out)
    assert window(out, "stem.validation_1.a2") == (None, None)


def test_point_23_a_petition_starting_on_the_cards_first_day_steps_back(
    client: TestClient,
) -> None:
    # Boundary: validity_start 2025-06-09 is a1's own first day, not before it, so it could
    # extend a1 and the late-filing conflict is skipped. Filed 2025-03-03, approved 2025-05-01.
    # Kills: "before the card start" turned to "on or before" in the point 23 test.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2025-03-03",
            requested_start="2025-06-09",
            outcome="approved",
            outcome_on="2025-05-01",
            validity_start="2025-06-09",
        ),
    )
    assert STEP_BACK in reasons(out)
    assert LATE_FILING not in reasons(out)


def test_point_23_a_petition_starting_the_day_before_the_card_keeps_the_conflict(
    client: TestClient,
) -> None:
    # Boundary, the other side: validity_start 2025-06-08, one day before a1's start
    # 2025-06-09 (and before a2's), so it extends neither card and the conflict stays.
    # Kills: "before the card start" turned to "before the card end", or the day compared
    # with the day after.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2025-03-03",
            requested_start="2025-06-08",
            outcome="approved",
            outcome_on="2025-05-01",
            validity_start="2025-06-08",
        ),
    )
    assert LATE_FILING in reasons(out)


def test_point_23_an_approved_petition_is_judged_by_its_validity_start(
    client: TestClient,
) -> None:
    # Approved: requested_start 2025-06-01 is before a1's start 2025-06-09, but validity_start
    # 2025-10-01 is after it, and "validity_start when approved" decides. It could extend a1.
    # Kills: the requested start read for an approved petition.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2025-03-03",
            requested_start="2025-06-01",
            outcome="approved",
            outcome_on="2025-05-01",
            validity_start="2025-10-01",
        ),
    )
    assert STEP_BACK in reasons(out)
    assert LATE_FILING not in reasons(out)


def test_point_23_a_denied_petition_is_judged_by_its_requested_start(client: TestClient) -> None:
    # Denied, so "else requested_start": 2020-10-01, before a1's start 2025-06-09. It cannot
    # extend a1 and the conflict stays. Kills: a denied petition that always steps back, or
    # only validity_start read.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2020-04-01",
            requested_start="2020-10-01",
            outcome="denied",
            outcome_on="2020-06-01",
        ),
    )
    assert LATE_FILING in reasons(out)


def test_point_23_a_petition_with_no_start_is_asked_and_withholds_the_step_back(
    client: TestClient,
) -> None:
    # "When the start needed to decide this is missing, it is asked." Pending, filed
    # 2026-07-01, requested_start left out. a2's validation_1 closes 2026-12-23, after the
    # filing, so it is null while the start is unanswered.
    # D94 (SPEC-W2-UNKNOWN points 32, 33, 35, superseding 23a's step back here): the start is
    # asked by name, cap_gap.for_dso is withheld, not given, and the outputs it would null
    # wait on the start; the verdict is cannot_tell.
    # Kills: a missing start read as "cannot extend" (PRINCIPLES 2), or not asked; (D94) the
    # step back given on a start not known.
    out = _send(
        client,
        _with_petition(
            journeys.j19(),
            type="h1b",
            cap_subject="no",
            filed_on="2026-07-01",
            outcome="pending",
        ),
    )
    assert "h9.requested_start" in question_ids(out)
    assert _field(out, "h9.requested_start") == "requested_start"  # D94
    assert STEP_BACK not in reasons(out)  # D94
    assert "h9.requested_start" in (stage(out, "grace.p2").get("waits_on") or [])  # D94
    assert out["verdict"]["state"] == "cannot_tell"
    assert window(out, "stem.validation_1.a2") == (None, None)


# Point 23a, the period a petition would extend: "for a card's dates (reports, evaluations,
# unemployment, the card grace), the card, which begins on the card's start; for the program
# grace, the grace, which begins the day after the program ends. A petition whose start falls
# before that beginning cannot extend it: point 19 takes nothing from it. So a 2020 petition
# nulls nothing on J19, the program grace included, and gives no cap_gap.for_dso for those
# periods."


def _j19_2020() -> dict[str, Any]:
    # Fix6 finding 2's petition on plain J19: start 2020-10-01 (approved, validity_start).
    return _with_petition(
        journeys.j19(),
        type="h1b",
        cap_subject="yes",
        filed_on="2020-04-01",
        requested_start="2020-10-01",
        outcome="approved",
        outcome_on="2020-06-01",
        validity_start="2020-10-01",
    )


def test_point_23a_a_2020_petition_nulls_no_grace_on_j19(client: TestClient) -> None:
    # grace.p2 follows a2 (card start 2026-06-09) and p2 (ends 2025-05-16, so the program
    # grace begins 2025-05-17). 2020-10-01 is before both beginnings, so neither member nulls
    # it: 2028-06-09 to 2028-08-07 as in plain J19 (a2's card_end 2028-06-08 plus 60: June 9 to
    # 30 is 22, July 31 more is 53, August 1 to 7 is 60), after today, so later.
    # Kills: the program-end member of the grace still stepping back for a petition whose
    # start is before the day after the program ends.
    out = _send(client, _j19_2020())
    assert journeys._grace_dated(out) == [("grace.p2", "2028-06-09", "2028-08-07")]
    assert stage(out, "grace.p2")["state"] == "later"


def test_point_23a_a_2020_petition_gives_no_cap_gap_for_dso_on_j19(client: TestClient) -> None:
    # The 2020 start is before a1's start 2025-06-09, a2's start 2026-06-09 and the program
    # grace's beginning 2025-05-17, so point 19 takes nothing and there is no step back.
    # Kills: cap_gap.for_dso given for any petition whatever its start.
    out = _send(client, _j19_2020())
    assert STEP_BACK not in reasons(out)


def _j06_starting(requested_start: str) -> dict[str, Any]:
    # J06 (CPT only) with a pending petition filed 2025-11-03, before the grace's last day
    # 2026-02-10, so only its start decides whether it could extend the program grace.
    return _with_petition(
        journeys.j06(),
        type="h1b",
        cap_subject="yes",
        filed_on="2025-11-03",
        requested_start=requested_start,
        outcome="pending",
    )


def test_point_23a_j06s_program_grace_stands_for_a_start_the_day_before_it(
    client: TestClient,
) -> None:
    # p1 ends 2025-12-12, so the program grace begins 2025-12-13 and ends 2026-02-10 (worked
    # in the point 25 tests). Pending, so the start used is requested_start 2025-12-12, the
    # day before the grace begins: it cannot extend the grace, which stands.
    # Kills: the program grace judged against the program's end day, or not judged at all.
    out = _send(client, _j06_starting("2025-12-12"))
    assert journeys._grace_dated(out) == [("grace.p1", "2025-12-13", "2026-02-10")]


def test_point_23a_j06s_program_grace_is_null_for_a_start_on_its_first_day(
    client: TestClient,
) -> None:
    # Boundary, the other side: requested_start 2025-12-13, the grace's own first day, is not
    # before it, so the petition could extend it and point 19 nulls it.
    # Kills: "before the beginning" turned to "on or before".
    out = _send(client, _j06_starting("2025-12-13"))
    assert STEP_BACK in reasons(out)
    assert journeys._grace_dated(out) == []


# Point 23a, the start used: "validity_start when approved and entered, else requested_start.
# Only when both are missing is a start asked (`<petition>.requested_start`, or
# `validity_start` when approved and requested_start is missing), and point 19 steps back
# until it is answered. Point 21's strict xfail (approved, requested_start entered,
# validity_start missing) stays: nothing is asked there." The J19 late twin as above: a2 filed
# 2026-07-20, after a1's end 2026-06-08.
# D94 amends this: petition.requested_start and petition.validity_start are each asked when
# empty, and while one is unanswered the step back is withheld (points 32, 33 and 35 supersede
# 23a's step back), so an approved petition with no validity_start no longer falls back to
# requested_start, and point 21's xfail is lifted (test_journeys.py J19).


def test_point_23a_approved_with_no_validity_start_asks_it_and_withholds(
    client: TestClient,
) -> None:
    # Approved, validity_start left out, requested_start 2020-10-01. D94 (SPEC-W2-UNKNOWN
    # points 32, 33, 35, superseding 23a here): an empty validity_start is asked, not filled
    # from requested_start, so the start used is not known. Both the late-filing conflict and
    # cap_gap.for_dso rest on it and are withheld; grace.p2 waits on the start by name; the
    # verdict is cannot_tell. requested_start, entered, is not asked.
    # Kills: (D94) the requested start read in place of an empty validity start, the step back
    # or the conflict given on a start not known.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2020-04-01",
            requested_start="2020-10-01",
            outcome="approved",
            outcome_on="2020-06-01",
        ),
    )
    assert _field(out, "h9.validity_start") == "validity_start"  # D94
    assert LATE_FILING not in reasons(out)  # D94
    assert STEP_BACK not in reasons(out)
    assert "h9.validity_start" in (stage(out, "grace.p2").get("waits_on") or [])  # D94
    assert "h9.requested_start" not in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"  # D94


def test_point_23a_approved_with_no_validity_start_and_a_later_requested_start_withholds(
    client: TestClient,
) -> None:
    # The other side: requested_start 2026-10-01, after a1's start 2025-06-09. Before D94 it
    # was the start used and the step back held. D94: the empty validity_start is asked and
    # the step back is withheld for it all the same, whatever requested_start says; the
    # conflict stays skipped; grace.p2 waits on the start by name; cannot_tell.
    # Kills: (D94) the requested start read in place of an empty validity start.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2026-04-01",
            requested_start="2026-10-01",
            outcome="approved",
            outcome_on="2026-06-20",
        ),
    )
    assert _field(out, "h9.validity_start") == "validity_start"  # D94
    assert STEP_BACK not in reasons(out)  # D94
    assert LATE_FILING not in reasons(out)
    assert "h9.validity_start" in (stage(out, "grace.p2").get("waits_on") or [])  # D94
    assert out["verdict"]["state"] == "cannot_tell"  # D94


def test_point_23a_approved_with_no_requested_start_is_judged_by_its_validity_start(
    client: TestClient,
) -> None:
    # Approved, requested_start left out, validity_start 2026-10-01 entered: the start used is
    # 2026-10-01, after a1's start, so it steps back; requested_start is not asked, since
    # a start is entered. Kills: requested_start asked whenever it is missing.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2026-04-01",
            outcome="approved",
            outcome_on="2026-06-20",
            validity_start="2026-10-01",
        ),
    )
    assert STEP_BACK in reasons(out)
    assert LATE_FILING not in reasons(out)
    assert "h9.requested_start" not in question_ids(out)


def test_point_23a_approved_with_neither_start_asks_the_validity_start_and_withholds(
    client: TestClient,
) -> None:
    # Approved, both starts left out: validity_start is asked, so the verdict waits and the
    # conflict is not raised. D94 (SPEC-W2-UNKNOWN points 32, 33, 35, superseding 23a's step
    # back here): while the start is unanswered both cap_gap.for_dso and the late-filing
    # conflict rest on it, so neither is raised, and grace.p2, which either could change,
    # waits on the start by name.
    # Kills: a missing start read as "cannot extend" (PRINCIPLES 2), or nothing asked; (D94)
    # the step back given on a start not known.
    out = _send(
        client,
        _j19_late(
            type="h1b",
            cap_subject="yes",
            filed_on="2026-04-01",
            outcome="approved",
            outcome_on="2026-06-20",
        ),
    )
    assert "h9.validity_start" in question_ids(out)
    assert _field(out, "h9.validity_start") == "validity_start"  # D94
    assert STEP_BACK not in reasons(out)  # D94
    assert "h9.validity_start" in (stage(out, "grace.p2").get("waits_on") or [])  # D94
    assert LATE_FILING not in reasons(out)
    assert out["verdict"]["state"] == "cannot_tell"


# Point 23a, the Timeline mark: "An `unknown` stage's Timeline row carries no mark (not now,
# not done); it holds the DSO line and the words of cap_gap.for_dso." Point 22b corrects the
# second half: only a row whose stage carries cap_gap.for_dso in its own `reasons` (a stage a
# petition nulled) gets the DSO line and the words; other unknown rows keep their own dates.
# The row itself is the web's; what the engine gives it is the state, the stage's reasons and
# the words.


def test_point_23a_j13s_null_grace_is_not_done_and_carries_the_step_back_words(
    client: TestClient,
) -> None:
    # J13 without h1 would have grace.p1 2026-07-01 to 2026-08-29, wholly before today
    # 2026-09-29, so done. With h1 it is null, so neither done nor current: unknown. The row's
    # words come from cap_gap.for_dso and its rule capgap.petition_for_dso. Point 22b: h1 is
    # the member that nulled grace.p1, so grace.p1's own reasons hold cap_gap.for_dso.
    # Kills: a null stage given "done" because the dates it would have had lie in the past, an
    # unknown stage with no step-back words for its row, or the reason on the verdict only.
    out = _send(client, journeys.j13())
    grace = stage(out, "grace.p1")
    assert grace["state"] == "unknown"
    assert STEP_BACK in reasons(out)
    assert STEP_BACK in (grace.get("reasons") or [])
    assert out["rules"]["capgap.petition_for_dso"]["plain"].strip() != ""


# Point 24: "A petition type outside the pack's choices (for example "o1") is treated as
# missing and asked; it is never taken in silence (review note 2)." And the pack's plain words
# for the step back "name every kind of date point 19 nulls: the grace period, counts from the
# filing day, STEM reports and evaluations, and any cap-gap period. They say "A petition to
# change your status", not "An H-1B petition", unless the petition's type is h1b."


def test_unknown_choice_a_petition_type_outside_the_pack_is_asked(client: TestClient) -> None:
    # The pack's petition type choices are h1b and other (parameters.yaml, record petition).
    # "o1" is neither: asked as h9.type, and the verdict waits. The fix6 run gave 200 and asked
    # nothing. Kills: a choice value outside the pack's list taken as given.
    out = _send(
        client,
        _with_petition(
            journeys.j19(),
            type="o1",
            filed_on="2026-07-01",
            requested_start="2027-03-01",
            outcome="pending",
        ),
    )
    assert "h9.type" in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"


def test_unknown_choice_a_petition_type_in_the_pack_is_not_asked(client: TestClient) -> None:
    # The other side: type "other" is one of the pack's choices, so it is not asked.
    # Kills: every petition type asked.
    out = _send(
        client,
        _with_petition(
            journeys.j19(),
            type="other",
            filed_on="2026-07-01",
            requested_start="2027-03-01",
            outcome="pending",
        ),
    )
    assert "h9.type" not in question_ids(out)


def _step_back_plain(out: dict[str, Any]) -> str:
    assert STEP_BACK in reasons(out)
    words: str = out["rules"]["capgap.petition_for_dso"]["plain"]
    return words.lower()


def test_point_24_the_pack_words_name_every_kind_of_date_taken_away(client: TestClient) -> None:
    # J14 nulls all five kinds point 24 lists: the grace of p1, the total unemployment count,
    # the reports and evaluations from 2026-04-01 onward. The fix6 plain words name "the time
    # after a program, ... STEM reports, and ... days without work", not evaluations or a
    # cap-gap period (finding 3). Kills: plain words that leave out a kind.
    words = _step_back_plain(_send(client, journeys.j14()))
    assert "grace" in words or "time after a program" in words
    assert "count" in words or "days without work" in words
    assert "report" in words
    assert "evaluation" in words
    assert "cap-gap" in words


def test_point_24a_the_pack_words_say_a_petition_for_a_change_of_status(
    client: TestClient,
) -> None:
    # Point 24a (was point 24's "a petition to change your status"): the pack's plain words are
    # never about a person (contracts/rulepack.schema.json, the plain gate), so they say "A
    # petition for a change of status, such as one for H-1B", never "An H-1B petition" and never
    # "your". The test checks every kind of date taken away and the absence of "An H-1B
    # petition". J19 with a petition of type "other" (fix6 finding 3's input).
    # Kills: "An H-1B petition" said for a petition of another kind; "your" in the pack's words;
    # plain words that leave out a kind.
    out = _send(
        client,
        _with_petition(
            journeys.j19(),
            type="other",
            filed_on="2026-07-01",
            requested_start="2027-03-01",
            outcome="pending",
        ),
    )
    words = _step_back_plain(out)
    assert "a petition for a change of status" in words
    assert "an h-1b petition" not in words
    assert re.search(r"\byour\b", words) is None
    assert "grace" in words or "time after a program" in words
    assert "count" in words or "days without work" in words
    assert "report" in words
    assert "evaluation" in words
    assert "cap-gap" in words


# Point 25: "Tests that fail on each of: removing the petition member of
# stem_job_end.evaluation_final; removing the program-end petition member of the grace;
# `on_or_before` turned to `before` on a validation's filing test (a report due on the filing
# day); the point 23 skip in each direction (a 2020 petition keeps J19's late-filing conflict;
# a petition starting after the card start steps back)." The point 23 skip is tested above.


def _j15_with_petition(filed_on: str) -> dict[str, Any]:
    # A pending petition filed while a2 (2025-06-15 to 2027-06-14) runs, for a start of
    # 2026-10-01, on or after a2's start, so it could extend a2 (point 23).
    return _with_petition(
        journeys.j15(),
        type="h1b",
        cap_subject="yes",
        filed_on=filed_on,
        requested_start="2026-10-01",
        outcome="pending",
    )


def test_point_25_job_bs_final_evaluation_is_null_after_a_petition_filed_before_it(
    client: TestClient,
) -> None:
    # Fix6 finding 4's input: J15 plus a petition filed 2025-09-02. Job B (w3 under a2) ends
    # 2025-10-31; its final evaluation is due 10 days after: Nov 1 (1) ... Nov 10 (10) ->
    # 2025-11-10, on or after the filing, so null.
    # Kills (point 25): removing the petition member of stem_job_end.evaluation_final
    # (parameters.yaml, `none: {record: petition, ...}` in *stem_job_before_another).
    out = _send(client, _j15_with_petition("2025-09-02"))
    assert STEP_BACK in reasons(out)
    assert ("2025-10-31", "2025-11-10") not in journeys._final_evaluations(out)
    assert window(out, "stem_job_end.evaluation_final.w3") == (None, None)


def test_point_25_job_bs_final_evaluation_is_null_when_filed_on_its_due_day(
    client: TestClient,
) -> None:
    # Boundary: filed 2025-11-10, Job B's due day (worked above). "on or after the day the
    # petition was filed" holds on the day itself, so null.
    # Kills: `on_or_before` turned to `before` in the evaluation's petition member.
    out = _send(client, _j15_with_petition("2025-11-10"))
    assert ("2025-10-31", "2025-11-10") not in journeys._final_evaluations(out)


def test_point_25_job_bs_final_evaluation_stands_when_filed_the_day_after(
    client: TestClient,
) -> None:
    # The other side: filed 2025-11-11, after the due day 2025-11-10, so the petition cannot
    # change it and it is dated 2025-10-31 to 2025-11-10.
    # Kills: the member made to null the evaluation whatever the filing day.
    out = _send(client, _j15_with_petition("2025-11-11"))
    assert ("2025-10-31", "2025-11-10") in journeys._final_evaluations(out)


def _j06_with_petition(filed_on: str) -> dict[str, Any]:
    # J06 has CPT only, no OPT or STEM card, so only the program-end member of the grace can
    # null it. A pending petition for a start of 2026-10-01.
    return _with_petition(
        journeys.j06(),
        type="h1b",
        cap_subject="yes",
        filed_on=filed_on,
        requested_start="2026-10-01",
        outcome="pending",
    )


def test_point_25_j06s_program_grace_is_null_after_a_petition(client: TestClient) -> None:
    # Fix6 finding 4's input: J06 plus a petition filed 2025-11-03. p1 ends 2025-12-12; 2025-11-03
    # is on or before 2025-12-12 plus 60 days (2026-02-10, worked below), so the grace is null.
    # Kills (point 25): removing the program-end petition member of the grace (parameters.yaml,
    # `none: {record: petition, ... outer.end_date ... grace.after_completion_days}`).
    out = _send(client, _j06_with_petition("2025-11-03"))
    assert STEP_BACK in reasons(out)
    assert journeys._grace_dated(out) == []


def test_point_25_j06s_program_grace_is_null_when_filed_on_its_last_day(
    client: TestClient,
) -> None:
    # Boundary: p1 end 2025-12-12 plus 60 days: Dec 13 to 31 is 19, January 31 more is 50,
    # February 1 to 10 is 60 -> 2026-02-10. Filed that day: "on or before" holds, so null.
    # Kills: `on_or_before` turned to `before` in the program-end member.
    out = _send(client, _j06_with_petition("2026-02-10"))
    assert journeys._grace_dated(out) == []


def test_point_25_j06s_program_grace_stands_when_filed_after_it(client: TestClient) -> None:
    # The other side: filed 2026-02-11, after the grace's last day, so it cannot follow it.
    # The grace starts the day after the end, 2025-12-13, and ends 2026-02-10 (worked above).
    # Kills: the member made to null the grace whatever the filing day.
    out = _send(client, _j06_with_petition("2026-02-11"))
    assert journeys._grace_dated(out) == [("grace.p1", "2025-12-13", "2026-02-10")]


def _j14_filed(filed_on: str) -> dict[str, Any]:
    # J14's petition h1 (requested_start 2026-10-01, after a2's start 2024-06-01, so it could
    # extend a2 under point 23), filed on another day.
    return _set(journeys.j14(), "h1", filed_on=filed_on)


def test_point_25_validation_3_due_on_the_filing_day_is_null(client: TestClient) -> None:
    # a2 starts 2024-06-01. Validation 3: plus 18 months is 2025-12-01, a Monday; plus 10
    # business days: Dec 2, 3, 4, 5, 8, 9, 10, 11, 12, 15 -> due 2025-12-15. Filed 2025-12-15,
    # the due day: "on or after the day the petition was filed", so null.
    # Kills (point 25): `on_or_before` turned to `before` on validation_3's filing test.
    out = _send(client, _j14_filed("2025-12-15"))
    assert window(out, "stem.validation_3.a2") == (None, None)


def test_point_25_validation_3_due_the_day_before_the_filing_stands(client: TestClient) -> None:
    # The other side: filed 2025-12-16, the day after the due day, so validation 3 stands at
    # 2025-12-01 to 2025-12-15 (worked above).
    # Kills: the filing test made to null every report, or "before" read as "on or after".
    out = _send(client, _j14_filed("2025-12-16"))
    assert window(out, "stem.validation_3.a2") == ("2025-12-01", "2025-12-15")


def test_point_25_validation_2_due_on_the_filing_day_is_null(client: TestClient) -> None:
    # Validation 2: 2024-06-01 plus 12 months is 2025-06-01, a Sunday; plus 10 business days:
    # Jun 2, 3, 4, 5, 6, 9, 10, 11, 12, 13 -> due 2025-06-13. Filed 2025-06-13: null.
    # Kills (point 25): `on_or_before` turned to `before` on validation_2's filing test.
    out = _send(client, _j14_filed("2025-06-13"))
    assert window(out, "stem.validation_2.a2") == (None, None)


def test_point_25_validation_2_due_the_day_before_the_filing_stands(client: TestClient) -> None:
    # Filed 2025-06-14: validation 2 stands at 2025-06-01 to 2025-06-13 (worked above).
    # Kills: validation_2 nulled whatever the filing day.
    out = _send(client, _j14_filed("2025-06-14"))
    assert window(out, "stem.validation_2.a2") == ("2025-06-01", "2025-06-13")


def test_point_25_validation_1_due_on_the_filing_day_is_null(client: TestClient) -> None:
    # Validation 1: 2024-06-01 plus 6 months is 2024-12-01, a Sunday; plus 10 business days:
    # Dec 2, 3, 4, 5, 6, 9, 10, 11, 12, 13 -> due 2024-12-13. Filed 2024-12-13: null.
    # Kills (point 25): `on_or_before` turned to `before` on validation_1's filing test.
    out = _send(client, _j14_filed("2024-12-13"))
    assert window(out, "stem.validation_1.a2") == (None, None)


def test_point_25_validation_1_due_the_day_before_the_filing_stands(client: TestClient) -> None:
    # Filed 2024-12-14: validation 1 stands at 2024-12-01 to 2024-12-13 (worked above).
    # Kills: validation_1 nulled whatever the filing day.
    out = _send(client, _j14_filed("2024-12-14"))
    assert window(out, "stem.validation_1.a2") == ("2024-12-01", "2024-12-13")


# Point 26: "The requested start stays asked, because point 23 needs it." The outcome is not
# required while cap-gap is deferred (point 21), so the engine does not ask for it.


def test_point_26_the_requested_start_is_asked_when_left_out(client: TestClient) -> None:
    # J19 plus a petition filed 2026-07-01 with no outcome and no requested_start: the start
    # point 23 needs is asked. Kills: requested_start dropped from what the pack asks.
    out = _send(
        client,
        _with_petition(journeys.j19(), type="h1b", cap_subject="no", filed_on="2026-07-01"),
    )
    assert "h9.requested_start" in question_ids(out)


def test_point_26_the_outcome_is_not_asked_while_cap_gap_is_deferred(client: TestClient) -> None:
    # The same petition with requested_start and validity_start 2027-03-01, both after a2's
    # start 2026-06-09, so whatever the outcome it could extend a2 and the step back is the
    # same: the outcome decides nothing and is not asked. Kills: h9.outcome asked again.
    out = _send(
        client,
        _with_petition(
            journeys.j19(),
            type="h1b",
            cap_subject="no",
            filed_on="2026-07-01",
            requested_start="2027-03-01",
            validity_start="2027-03-01",
        ),
    )
    assert "h9.outcome" not in question_ids(out)
    assert STEP_BACK in reasons(out)
