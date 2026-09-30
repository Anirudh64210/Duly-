"""Hidden twins of the journeys of specs/path-1/journeys.json, with other dates.

Specified in specs/product-2/resolutions.md point 2 ("Hidden twins with other dates are in
tests/holdout") and specs/path-1/programs.md section 22 ("each a pair on either side of
the line it turns on"). Each twin keeps a journey's shape and moves its dates, or moves one
fact across the line the journey turns on. Every case goes through POST /v1/compute, as
tests/unit/acceptance/test_journeys.py does; the two share no expected value.

Each date and count is worked out by hand beside its assertion. Today is 2026-09-29 in
America/New_York, through an injected FixedClock.
"""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock
from tests.support.api_client import CheckedClient
from tests.support.records_case import (
    CLOCK,
    case,
    reasons,
    rec,
    stage,
    stage_ids,
    value,
    whole,
    window,
)


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_clock] = lambda: CLOCK
    try:
        yield CheckedClient(app)
    finally:
        app.dependency_overrides.pop(get_clock, None)


def _send(client: TestClient, body: dict[str, Any]) -> dict[str, Any]:
    res = client.post("/v1/compute", json=body)
    assert res.status_code == 200, res.text
    out: dict[str, Any] = res.json()
    return out


def _masters(end: str, **extra: Any) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "where": "us_on_f1",
        "school_name": "School H",
        "level": "master",
        "field_name": "Finance",
        "stem_list": "not_on_list",
        "end_date": end,
        "state": "completed",
    }
    fields.update(extra)
    return rec("p1", "program", **fields)


def _opt(rid: str, program: str, start: str, end: str, **extra: Any) -> dict[str, Any]:
    return rec(
        rid,
        "authorization",
        type="opt_post_completion",
        program=program,
        decision="approved",
        card_start=start,
        card_end=end,
        **extra,
    )


def _dated_after(out: dict[str, Any], prefix: str, card: str, day: str) -> list[str]:
    return [
        w["id"]
        for s in out["stages"]
        for w in s["windows"]
        if w["id"].startswith(prefix)
        and w["id"].endswith("." + card)
        and any(d is not None and d > day for d in (w["opens"], w["closes"]))
    ]


def _grace_after(out: dict[str, Any], day: str) -> list[str]:
    return [
        s["id"]
        for s in out["stages"]
        if s["id"].startswith("grace.")
        and any(d is not None and d > day for d in (s["starts"], s["ends"]))
    ]


# J01 twin: the master's card moved.


def test_twin_j01_masters_card_windows_and_count(client: TestClient) -> None:
    # p1 end 2026-06-12. Minus 90: 05-13 (30), 04-13 (60), 03-14 (90). Plus 60: 06-30 (18),
    # 07-31 (49), 08-11 (60). Card 2026-07-20 to 2027-07-19; STEM opens minus 90: 06-19
    # (30), 05-20 (60), 04-20 (90). No work 2026-07-20 to 08-23: 12 + 23 = 35.
    body = case(
        [
            _masters("2026-06-12", stem_list="on_list", start_date="2024-08-26"),
            _opt("a1", "p1", "2026-07-20", "2027-07-19"),
            rec("e1", "employer", name="Employer H", e_verify="yes"),
            rec("w1", "work", employer="e1", under="a1", start="2026-08-24", hours_per_week=40),
        ],
        whole("program", "authorization:p1", "move", "work", "trip"),
    )
    out = _send(client, body)
    assert window(out, "opt.apply_window.a1") == ("2026-03-14", "2026-08-11")
    assert window(out, "stem.apply_window.a1")[0] == "2027-04-20"
    assert value(out, "unemployment.opt_card.a1") == 35


# J02 twin: the bachelor's conferred outside the ten years.


def test_twin_j02_a_basis_older_than_ten_years_gives_no_stem_step(client: TestClient) -> None:
    # Journey variant: conferred 2016-05-14. Window opens 2026-10-21; minus 60 days is
    # 2026-08-22; minus 10 years is 2016-08-22. 2016-05-14 is before it, so p1 is not a
    # candidate basis, and the MBA is not on the list: stem.a1 is not next.
    body = case(
        [
            rec(
                "p0",
                "program",
                where="us_on_f1",
                school_name="School G",
                level="bachelor",
                field_name="Computer Science",
                stem_list="on_list",
                start_date="2012-08-27",
                end_date="2016-05-06",
                state="completed",
                conferred_on="2016-05-14",
            ),
            _masters("2025-12-12", start_date="2024-08-26"),
            _opt("a1", "p1", "2026-01-20", "2027-01-19"),
        ],
        whole("program", "authorization:p0", "authorization:p1"),
    )
    out = _send(client, body)
    assert all(s["state"] != "next" for s in out["stages"] if s["id"] == "stem.a1")


# J03 twin: CPT at two schools, other dates.


def test_twin_j03_cpt_at_two_schools_at_one_level(client: TestClient) -> None:
    # 2023-06-05 to 08-25: 26 + 31 + 25 = 82. 2025-06-02 to 08-22: 29 + 31 + 22 = 82. 164.
    body = case(
        [
            _masters("2023-12-15", start_date="2022-08-22"),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School J",
                level="master",
                field_name="Analytics",
                start_date="2024-08-26",
                end_date="2026-05-08",
                state="completed",
            ),
            rec("mv1", "move", how="transfer", from_program="p1", to_program="p2"),
            rec(
                "a1",
                "authorization",
                type="cpt",
                program="p1",
                time="full_time",
                card_start="2023-06-05",
                card_end="2023-08-25",
            ),
            rec(
                "a2",
                "authorization",
                type="cpt",
                program="p2",
                time="full_time",
                card_start="2025-06-02",
                card_end="2025-08-22",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move"),
    )
    out = _send(client, body)
    assert value(out, "cpt.full_time_days_at_level.master") == 164


# J06 pair: 364 and 365 days, the journey's planning point.


def _j06_like(last_end: str) -> dict[str, Any]:
    spans = [
        ("a1", "2024-05-20", "2024-08-16"),
        ("a2", "2024-08-19", "2024-12-20"),
        ("a3", "2025-01-06", "2025-05-16"),
        ("a4", "2025-05-19", last_end),
    ]
    return case(
        [
            _masters("2025-12-12", start_date="2023-08-21", first_year_done_on="2024-05-09"),
            *[
                rec(
                    rid,
                    "authorization",
                    type="cpt",
                    program="p1",
                    time="full_time",
                    card_start=s,
                    card_end=e,
                )
                for rid, s, e in spans
            ],
        ],
        whole("program", "authorization:p1"),
    )


def test_twin_j06_364_days_is_under_the_bar(client: TestClient) -> None:
    # 89 + 124 + 131 = 344; 2025-05-19 to 06-07 is 13 + 7 = 20. 364 < 365.
    out = _send(client, _j06_like("2025-06-07"))
    assert value(out, "cpt.full_time_days_at_level.master") == 364
    assert "cpt.full_time_days_at_level.at_or_over_limit.master" not in reasons(out)


def test_twin_j06_365_days_is_at_the_bar(client: TestClient) -> None:
    # 2025-05-19 to 06-08 is 21 days: 344 + 21 = 365, at cpt.full_time_bar_days.
    out = _send(client, _j06_like("2025-06-08"))
    assert value(out, "cpt.full_time_days_at_level.master") == 365
    assert "cpt.full_time_days_at_level.at_or_over_limit.master" in reasons(out)


# J08 twin: the master's starts later. The trip list is stated whole, or not (point 13).


def _j08_like(trips_whole: bool) -> dict[str, Any]:
    trips = ("trip",) if trips_whole else ()
    return case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School K",
                level="bachelor",
                field_name="Physics",
                stem_list="on_list",
                start_date="2020-08-24",
                end_date="2024-05-10",
                state="completed",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School K",
                level="master",
                field_name="Physics",
                start_date="2025-02-24",
                end_date="2026-12-18",
                state="in_progress",
            ),
            rec("mv1", "move", how="change_of_level", from_program="p1", to_program="p2"),
            _opt("a1", "p1", "2024-06-03", "2025-06-02"),
            rec("e1", "employer", name="Employer K"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2024-07-22",
                end="2025-02-23",
                hours_per_week=40,
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move", "work", *trips),
    )


def test_twin_j08_opt_ends_the_day_before_a_later_masters_start(client: TestClient) -> None:
    # p2 starts 2025-02-24: a1 ends 2025-02-23. No work 2024-06-03 to 07-21: 28 + 21 = 49.
    out = _send(client, _j08_like(trips_whole=True))
    assert stage(out, "opt_post.a1")["ends"] == "2025-02-23"
    assert value(out, "unemployment.opt_card.a1") == 49


def test_twin_j08_no_count_before_the_trip_list_is_whole(client: TestClient) -> None:
    # Resolutions point 13: the counter reads trips, so with no statement that the trip
    # list is whole the count is null, not the 49 worked out above.
    out = _send(client, _j08_like(trips_whole=False))
    assert value(out, "unemployment.opt_card.a1") is None


# J09 pair: asked on the old end, and the day after.


def _j09_like(requested_on: str) -> dict[str, Any]:
    return case(
        [
            _masters("2026-01-16", start_date="2023-08-21"),
            rec(
                "ec1",
                "end_date_change",
                program="p1",
                change="extension",
                old_end="2025-05-16",
                new_end="2026-01-16",
                requested_on=requested_on,
                granted_on="2025-05-18",
                reason="academic",
            ),
            _opt("a1", "p1", "2026-02-01", "2027-01-31", filed_on="2025-11-01"),
        ],
        whole("program", "authorization:p1", "end_date_change", "trip"),
    )


def test_twin_j09_asked_on_the_old_end_date_is_in_time(client: TestClient) -> None:
    # Section 14 check: an extension was asked for on or before old_end. 2025-05-16 is
    # the old end itself. End in force on 2025-11-01 is 2026-01-16: minus 90 is 12-17 (30),
    # 11-17 (60), 10-18 (90); plus 60 is 01-31 (15), 02-28 (43), 03-17 (60). Complete by:
    # plus 14 months, 2027-03-16.
    out = _send(client, _j09_like("2025-05-16"))
    assert "conflict:end_date_change.asked_before_end.ec1" not in reasons(out)
    assert window(out, "opt.apply_window.a1") == ("2025-10-18", "2026-03-17")
    assert window(out, "opt.complete_by.a1")[1] == "2027-03-16"


def test_twin_j09_asked_the_day_after_the_old_end_is_asked_about(client: TestClient) -> None:
    out = _send(client, _j09_like("2025-05-17"))
    assert "conflict:end_date_change.asked_before_end.ec1" in reasons(out)


# J10 pair: no move, so grace is computed.


def test_twin_j10_without_a_move_grace_is_60_days(client: TestClient) -> None:
    # p1 end 2025-05-16, no card. Plus 60: 05-31 (15), 06-30 (45), 07-15 (60).
    body = case(
        [_masters("2025-05-16", start_date="2023-08-21")],
        whole("program", "authorization:p1", "move"),
    )
    out = _send(client, body)
    assert stage(out, "grace.p1")["ends"] == "2025-07-15"


# J11 twin: the leave trip becomes personal.


def test_twin_j11_personal_days_abroad_during_a_job_count(client: TestClient) -> None:
    # As J11 (86), with t1 personal: 2025-12-18 to 2026-01-05 is 14 + 5 = 19 more days.
    # Section 14: trip days with purpose personal do not qualify. 86 + 19 = 105.
    body = case(
        [
            _masters("2025-08-15"),
            _opt("a1", "p1", "2025-10-01", "2026-09-30"),
            rec("e1", "employer", name="Employer L"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2025-10-15",
                end="2026-02-27",
                hours_per_week=40,
            ),
            rec("w2", "work", employer="e1", under="a1", start="2026-05-11", hours_per_week=40),
            rec(
                "t1",
                "trip",
                left_on="2025-12-18",
                returned_on="2026-01-05",
                purpose="personal",
                reentry_i20="p1",
                signature_on="2025-09-10",
                job_on_return="yes",
            ),
            rec(
                "t2",
                "trip",
                left_on="2026-03-10",
                returned_on="2026-04-20",
                purpose="personal",
                reentry_i20="p1",
                signature_on="2026-03-02",
                job_on_return="no",
            ),
        ],
        whole("program", "authorization:p1", "work", "trip", "petition"),
    )
    out = _send(client, body)
    assert value(out, "unemployment.opt_card.a1") == 105


# J12 twins: another validity start, a pending petition, and the older row.


def _cap_gap_case(card: tuple[str, str], filed: str, start: str, **petition: Any) -> dict[str, Any]:
    return case(
        [
            _masters("2025-05-16"),
            _opt("a1", "p1", *card),
            rec("e1", "employer", name="Employer M"),
            rec("w1", "work", employer="e1", under="a1", start=card[0], hours_per_week=40),
            rec(
                "h1",
                "petition",
                type="h1b",
                cap_subject="yes",
                employer="e1",
                filed_on=filed,
                requested_start=start,
                change_of_status="yes",
                **petition,
            ),
        ],
        whole("program", "authorization:p1", "work", "petition", "trip"),
    )


def test_twin_j12_cap_gap_ends_on_a_later_validity_start(client: TestClient) -> None:
    # validity_start 2026-11-15 is before April 1 of FY 2027 (2027-04-01): ends 2026-11-15.
    # resolutions point 15: the petition is approved with a change of status, so H-1B
    # status begins on 2026-11-15 and no F-1 grace follows it: no grace stage holds a date
    # after 2026-11-15 (this replaces the point 12 grace.h1 from 2026-11-16).
    body = _cap_gap_case(
        ("2025-06-01", "2026-05-31"),
        "2026-04-01",
        "2026-11-15",
        outcome="approved",
        outcome_on="2026-06-20",
        validity_start="2026-11-15",
    )
    out = _send(client, body)
    assert stage(out, "cap_gap.h1")["ends"] == "2026-11-15"
    assert _grace_after(out, "2026-11-15") == []


def test_twin_j12_pending_petition_runs_to_april_1(client: TestClient) -> None:
    # Journey variant (pending): filed 2026-04-01, from 2025-01-17 the row is 04-01; the
    # fiscal year holding 2026-10-01 starts 2026-10-01 (FY 2027), so April 1 is 2027-04-01.
    body = _cap_gap_case(
        ("2025-06-01", "2026-05-31"), "2026-04-01", "2026-10-01", outcome="pending"
    )
    out = _send(client, body)
    assert stage(out, "cap_gap.h1")["ends"] == "2027-04-01"


def test_twin_j12_a_petition_filed_under_the_older_row_runs_to_october_1(
    client: TestClient,
) -> None:
    # Journey variant (old rule): filed 2024-04-01, before 2025-01-17, read with the 10-01
    # row. Requested start 2024-10-01 lies in FY 2025 (2024-10-01 to 2025-09-30), whose
    # October 1 is 2024-10-01. Card 2023-06-01 to 2024-05-31: cap-gap from 2024-06-01.
    body = _cap_gap_case(
        ("2023-06-01", "2024-05-31"), "2024-04-01", "2024-10-01", outcome="pending"
    )
    out = _send(client, body)
    cap_gap = stage(out, "cap_gap.h1")
    assert (cap_gap["starts"], cap_gap["ends"]) == ("2024-06-01", "2024-10-01")


# J13 twin: denied later.


def test_twin_j13_denied_later_ends_the_cap_gap_and_steps_back(client: TestClient) -> None:
    # Card 2025-07-01 to 2026-06-30; denied 2026-09-02: cap-gap 2026-07-01 to 2026-09-02.
    body = _cap_gap_case(
        ("2025-07-01", "2026-06-30"),
        "2026-04-01",
        "2026-10-01",
        outcome="denied",
        outcome_on="2026-09-02",
    )
    out = _send(client, body)
    cap_gap = stage(out, "cap_gap.h1")
    assert (cap_gap["starts"], cap_gap["ends"]) == ("2026-07-01", "2026-09-02")
    assert any("grace.after_cap_gap_outcome" in r for r in reasons(out))


# J12 twin: a pending petition, on the other side of point 15's line.


def test_twin_j12_pending_petition_keeps_its_grace_after_the_cap_gap(client: TestClient) -> None:
    # The other side of point 15's line: a petition not yet approved starts no H-1B status,
    # so the grace of point 4 still follows the cap-gap. Card 2025-06-01 to 2026-05-31,
    # pending: cap-gap to 2027-04-01 (FY 2027), grace.h1 from 2027-04-02.
    body = _cap_gap_case(
        ("2025-06-01", "2026-05-31"), "2026-04-01", "2026-10-01", outcome="pending"
    )
    out = _send(client, body)
    assert stage(out, "grace.h1")["starts"] == "2027-04-02"


# J04 twin: a STEM card cut short by a transfer on other days.


def _j04_like() -> dict[str, Any]:
    return case(
        [
            _masters("2020-12-18", field_name="Physics", stem_list="on_list"),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School K",
                level="doctorate",
                field_name="Physics",
                start_date="2023-03-20",
                end_date="2028-05-12",
                state="in_progress",
            ),
            rec(
                "mv1",
                "move",
                how="transfer",
                from_program="p1",
                to_program="p2",
                release_date="2023-03-03",
            ),
            _opt("a1", "p1", "2021-01-11", "2022-01-10"),
            rec(
                "a2",
                "authorization",
                type="stem_extension",
                program="p1",
                extends="a1",
                basis_program="p1",
                decision="approved",
                card_start="2022-01-11",
                card_end="2024-01-10",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move", "trip"),
    )


def test_twin_j04_concluding_evaluation_from_the_release_date(client: TestClient) -> None:
    # resolutions point 15, (f)(10)(ii)(C)(9)(i). The release 2023-03-03 is before the day
    # before the doctorate (2023-03-19) and the card end 2024-01-10, so a2 ends 2023-03-03.
    # Plus 10 days: Mar 4 (1) ... Mar 13 (10). The card end would give 2024-01-10 to 01-20.
    out = _send(client, _j04_like())
    assert stage(out, "stem.a2")["ends"] == "2023-03-03"
    assert window(out, "stem.evaluation_final.a2") == ("2023-03-03", "2023-03-13")


def test_twin_j04_validations_stop_at_the_release_date(client: TestClient) -> None:
    # a2 starts 2022-01-11: validations 2022-07-11, 2023-01-11, 2023-07-11, 2024-01-11. The
    # last two lie after 2023-03-03, so none of a2's validations holds a later date; the
    # second still opens 2023-01-11.
    out = _send(client, _j04_like())
    assert _dated_after(out, "stem.validation_", "a2", "2023-03-03") == []
    assert window(out, "stem.validation_2.a2")[0] == "2023-01-11"


# J14 twin: the STEM job ends long before the card, with no cap-gap.


def _j14_like() -> dict[str, Any]:
    return case(
        [
            _masters("2022-12-16", field_name="Statistics", stem_list="on_list"),
            _opt("a1", "p1", "2023-01-09", "2024-01-08"),
            rec(
                "a2",
                "authorization",
                type="stem_extension",
                program="p1",
                extends="a1",
                basis_program="p1",
                employer="e1",
                decision="approved",
                card_start="2024-01-09",
                card_end="2026-01-08",
            ),
            rec("e1", "employer", name="Employer Q", e_verify="yes"),
            rec(
                "w1",
                "work",
                employer="e1",
                under="a1",
                start="2023-01-09",
                end="2024-01-08",
                hours_per_week=40,
            ),
            rec(
                "w2",
                "work",
                employer="e1",
                under="a2",
                start="2024-01-09",
                end="2025-04-18",
                hours_per_week=40,
            ),
        ],
        whole("program", "authorization:p1", "work", "trip"),
    )


def test_twin_j14_concluding_evaluation_from_the_jobs_end(client: TestClient) -> None:
    # resolutions point 15: the job's end (2025-04-18) is sooner than the card's (2026-01-08).
    # Plus 10 days: Apr 19 (1) ... Apr 28 (10). The card end would give 2026-01-08 to 01-18.
    out = _send(client, _j14_like())
    assert window(out, "stem.evaluation_final.a2") == ("2025-04-18", "2025-04-28")


def test_twin_j14_no_validation_after_the_jobs_end(client: TestClient) -> None:
    # a2 starts 2024-01-09: validations 2024-07-09, 2025-01-09, 2025-07-09, 2026-01-09. The
    # last two lie after 2025-04-18; the second still opens 2025-01-09.
    out = _send(client, _j14_like())
    assert _dated_after(out, "stem.validation_", "a2", "2025-04-18") == []
    assert window(out, "stem.validation_2.a2")[0] == "2025-01-09"


# J06 twin: the OPT filing window on either side of today.


def _no_opt_yet(end: str) -> dict[str, Any]:
    # Without a start_date this run built no opt_post.p1 stage, so the twin gives one.
    program = _masters(end, start_date="2024-08-26")
    return case([program], whole("program", "authorization:p1", "trip"))


def test_twin_j06_opt_is_not_next_once_its_filing_window_closed(client: TestClient) -> None:
    # resolutions point 15. p1 ends 2026-01-16. Minus 90: 12-17 (30), 11-17 (60), 10-18 (90).
    # Plus 60: 01-31 (15), 02-28 (43), 03-17 (60). 2026-03-17 is before 2026-09-29; only
    # opt.complete_by (to 2027-03-16) is open, and nothing is filed in it.
    out = _send(client, _no_opt_yet("2026-01-16"))
    assert window(out, "opt.apply_window.p1") == ("2025-10-18", "2026-03-17")
    assert all(s["state"] != "next" for s in out["stages"] if s["id"] == "opt_post.p1")


def test_twin_j06_opt_is_next_while_its_filing_window_is_open(client: TestClient) -> None:
    # The other side: p1 ends 2026-08-14. Plus 60: 08-31 (17), 09-30 (47), 10-13 (60), so
    # the filing window is open on 2026-09-29 and opt_post.p1 is next.
    out = _send(client, _no_opt_yet("2026-08-14"))
    assert window(out, "opt.apply_window.p1")[1] == "2026-10-13"
    assert stage(out, "opt_post.p1")["state"] == "next"


# J15 twin: a STEM card whose first validation crosses Thanksgiving.


def test_twin_j15_first_validation_skips_thanksgiving(client: TestClient) -> None:
    # STEM start 2025-05-20 plus 6 months: 2025-11-20, a Thursday. Plus 10 business days:
    # 21, 24, 25, 26, (27 Thanksgiving skipped) 28, Dec 1, 2, 3, 4, 5 -> 2025-12-05.
    body = case(
        [
            _masters("2024-04-12", stem_list="on_list"),
            _opt("a1", "p1", "2024-05-20", "2025-05-19"),
            rec(
                "a2",
                "authorization",
                type="stem_extension",
                program="p1",
                extends="a1",
                basis_program="p1",
                decision="approved",
                card_start="2025-05-20",
                card_end="2027-05-19",
            ),
        ],
        whole("program", "authorization:p1", "trip"),
    )
    out = _send(client, body)
    assert window(out, "stem.validation_1.a2") == ("2025-11-20", "2025-12-05")


# J16 pair: the earlier degree is a US degree on the list.


def test_twin_j16_a_us_degree_on_the_list_makes_stem_next(client: TestClient) -> None:
    # p0 us_other_status, bachelor, on_list, conferred 2021-06-30. a2 ends 2027-06-14: the
    # window opens 2027-03-16; minus 60 days 2027-01-15; minus 10 years 2017-01-15.
    # 2021-06-30 is after it and before p1 was done: a candidate basis, so stem.a2 is next.
    body = case(
        [
            rec(
                "p0",
                "program",
                where="us_other_status",
                school_name="School N",
                level="bachelor",
                field_name="Mechanical Engineering",
                stem_list="on_list",
                state="completed",
                conferred_on="2021-06-30",
            ),
            _masters("2026-05-15", start_date="2024-08-26"),
            _opt("a2", "p1", "2026-06-15", "2027-06-14"),
        ],
        whole("program", "authorization:p0", "authorization:p1"),
    )
    out = _send(client, body)
    assert stage(out, "stem.a2")["state"] == "next"


# J19 twin: the STEM card moved to cross Christmas.


def test_twin_j19_validation_skips_christmas(client: TestClient) -> None:
    # STEM start 2026-06-15 plus 6 months: 2026-12-15, a Tuesday. Plus 10 business days:
    # 16, 17, 18, 21, 22, 23, 24, (25 Christmas skipped) 28, 29, 30 -> 2026-12-30.
    body = case(
        [
            rec(
                "p1",
                "program",
                where="us_on_f1",
                school_name="School P",
                level="associate",
                field_name="Computer Science",
                start_date="2021-08-23",
                end_date="2023-05-19",
                state="completed",
            ),
            rec(
                "p2",
                "program",
                where="us_on_f1",
                school_name="School Q",
                level="bachelor",
                field_name="Computer Science",
                stem_list="on_list",
                start_date="2023-08-21",
                end_date="2025-05-16",
                state="completed",
            ),
            rec("mv1", "move", how="transfer", from_program="p1", to_program="p2"),
            _opt("a1", "p2", "2025-06-15", "2026-06-14"),
            rec(
                "a2",
                "authorization",
                type="stem_extension",
                program="p2",
                extends="a1",
                basis_program="p2",
                decision="approved",
                card_start="2026-06-15",
                card_end="2028-06-14",
            ),
        ],
        whole("program", "authorization:p1", "authorization:p2", "move", "trip"),
    )
    out = _send(client, body)
    assert window(out, "stem.validation_1.a2") == ("2026-12-15", "2026-12-30")
    assert "opt_post.p1" not in [i for i in stage_ids(out) if stage(out, i)["state"] == "next"]
