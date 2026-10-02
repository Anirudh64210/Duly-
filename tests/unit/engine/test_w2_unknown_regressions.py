"""Three faults the hidden journey property found on 2026-10-02: specs/step-w/SPEC-W2-UNKNOWN.md
point 47 (P2) run on the journeys of tests/unit/acceptance/test_journeys.py, kept here as
visible regressions. Each test puts one gap into one journey and asserts what points 6, 8 and
33 say of it. Today 2026-09-29 in America/New_York, through the injected FixedClock CLOCK.

Each expected date is worked by hand from the journey and the shipped pack
rulepacks/f1-us/v2026.09/parameters.yaml beside the assertion. Each test fails on the engine
at c04f662.
"""

import copy
from typing import Any

from engine import path
from engine.rulepack import load_all
from tests.support.records_case import CLOCK, stage, value
from tests.unit.acceptance import test_journeys as journeys


def _compute(body: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = path.compute(body, load_all(), CLOCK)
    return out


def _set(body: dict[str, Any], record_id: str, **fields: Any) -> dict[str, Any]:
    """The case with these fields of one record changed; a value of None leaves it out."""
    changed = copy.deepcopy(body)
    for r in changed["records"]:
        if r["id"] == record_id:
            for name, given in fields.items():
                if given is None:
                    r["fields"].pop(name, None)
                else:
                    r["fields"][name] = given
    return changed


def _computed(out: dict[str, Any], item_id: str) -> dict[str, Any]:
    found = [i for i in out["computed"] if i["id"] == item_id]
    assert found, f"no computed item {item_id}"
    one: dict[str, Any] = found[0]
    return one


def _question(out: dict[str, Any], qid: str) -> dict[str, Any] | None:
    found = [q for q in out["questions"] if q["id"] == qid]
    return found[0] if found else None


# Fault 1, points 6 and 33: a stage date shown while a record it rests on is undecided.
#
# The STEM stage's end rests on the transfer release date (opt.ends_on_release_date): the
# card's authorization ends on the release date of a move out of the card's program. j01: a2 is
# the post-completion card of p2; mv1 releases on 2024-07-15. If mv1.from_program is p1 (the
# journey), no move leaves p2, so stem.a2 has no end: a known null. If it is p2, the move
# leaves a2's program and stem.a2 ends on mv1's release date, 2024-07-15. j03 the same: a4 is
# p2's card, mv1 releases on 2024-07-22. With from_program not_sure the two fills give two
# different ends (null and the release date), so by point 6 the end is not known: point 33
# says it is null with a non-empty waits_on naming mv1.from_program. Today it is null with no
# waits_on, which reads as "does not apply".


def _stem_end_rests_on_the_move(jid: str, card: str, release: str) -> None:
    body = getattr(journeys, jid)()
    stage_id = "stem." + card
    # The fill p2 gives the release date, the fill p1 none: the gap changes the output.
    assert stage(_compute(_set(body, "mv1", from_program="p2")), stage_id)["ends"] == release
    assert stage(_compute(_set(body, "mv1", from_program="p1")), stage_id)["ends"] is None
    held = stage(_compute(_set(body, "mv1", from_program="not_sure")), stage_id)
    assert held["ends"] is None
    assert "mv1.from_program" in held.get("waits_on", [])


def test_j01_a_not_sure_move_withholds_the_stem_stage_end_it_could_set() -> None:
    # Points 6 and 33. j01: mv1 transfer, release_date 2024-07-15; a2 is p2's card.
    # Fails if: the stage's end is read through the undecided link as "no move leaves p2" and
    # emitted null with no waits_on (the engine at c04f662).
    _stem_end_rests_on_the_move("j01", "a2", "2024-07-15")


def test_j03_a_not_sure_move_withholds_the_stem_stage_end_it_could_set() -> None:
    # Points 6 and 33. j03: mv1 transfer, release_date 2024-07-22; a4 is p2's card.
    # Fails if: as j01.
    _stem_end_rests_on_the_move("j03", "a4", "2024-07-22")


# Fault 2, point 8 (and 46(b)): a blanked field nobody asks for.
#
# The opt_job_start stage is for each job under a post-completion card with a start, and its
# report window opens on the start and closes opt.report_employer_within_days (10) days later.
# j12: w1 under a1 (opt_post_completion), start 2025-06-01, so the window is 2025-06-01 to
# 2025-06-01 + 10 = 2025-06-11. j13: w1 start 2025-07-01, window 2025-07-01 to 2025-07-11.
# w1.start declares no when_absent, so absence is `ask` (point 2): left out, it is unknown, and
# each start it could be gives a different window. A gap that can change an output is asked
# (point 8), as question w1.start with record w1, field start, state absent (point 34), and
# the verdict is cannot_tell (point 46(d)). Today the job drops out of the stage and nothing
# asks for w1.start.


def _a_left_out_start_is_asked(jid: str, opens: str, closes: str) -> None:
    body = getattr(journeys, jid)()
    known = _compute(body)
    assert value(known, "opt_job_start.report.opens.w1") == opens
    assert value(known, "opt_job_start.report.closes.w1") == closes
    out = _compute(_set(body, "w1", start=None))
    asked = _question(out, "w1.start")
    assert asked is not None, [q["id"] for q in out["questions"]]
    assert asked.get("record") == "w1"
    assert asked.get("field") == "start"
    assert asked.get("state") == "absent"
    assert out["verdict"]["state"] == "cannot_tell"


def test_j12_a_job_start_left_out_is_asked() -> None:
    # Point 8. j12: w1 start 2025-06-01, report window 2025-06-01 to 2025-06-11 (+10 days).
    # Fails if: the absent start is read as "no start" and the job left out of opt_job_start
    # with no question (the engine at c04f662).
    _a_left_out_start_is_asked("j12", "2025-06-01", "2025-06-11")


def test_j13_a_job_start_left_out_is_asked() -> None:
    # Point 8. j13: w1 start 2025-07-01, report window 2025-07-01 to 2025-07-11 (+10 days).
    # Fails if: as j12.
    _a_left_out_start_is_asked("j13", "2025-07-01", "2025-07-11")


# Fault 3, point 6: a known date that changes to another known date when an unrelated field
# goes absent.
#
# stem.evaluation_final opens at the end of the STEM training (stem.opportunity_ends_with_job):
# the last job's end only when every job under the card has an end and none ends after it;
# while one runs on, the card end. j15: a2 is the STEM card, 2025-06-15 to 2027-06-14. Under a2
# are w3 (2025-06-15 to 2025-10-31) and w4 (from 2025-12-01, no end: not_yet). With w4 under
# a2 (the journey), w4 runs on, so the opens is the card end 2027-06-14. If w4 were not under
# a2, the only job under a2 is w3, ended 2025-10-31, so the opens is 2025-10-31. w4.under
# declares no when_absent (`ask`); left out, its fills include a2 and a1 and give these two
# dates, so by point 6 the date is withheld: value null with w4.under in waits_on (point 33),
# never replaced by either date. Today it shows 2025-10-31 with no waits_on.

FINAL_OPENS = "stem.evaluation_final.opens.a2"


def test_j15_a_job_link_left_out_withholds_the_concluding_evaluation_never_moves_it() -> None:
    # Point 6. j15 as written gives 2027-06-14; w4 under a1 gives 2025-10-31 (worked above).
    # Fails if: the absent link is read as "not under a2" and 2025-10-31 shown (the engine at
    # c04f662), or as "under a2" and 2027-06-14 shown with no waits_on.
    body = journeys.j15()
    assert value(_compute(body), FINAL_OPENS) == "2027-06-14"
    assert value(_compute(_set(body, "w4", under="a1")), FINAL_OPENS) == "2025-10-31"
    item = _computed(_compute(_set(body, "w4", under=None)), FINAL_OPENS)
    assert item["value"] is None, item
    assert "w4.under" in item.get("waits_on", []), item
