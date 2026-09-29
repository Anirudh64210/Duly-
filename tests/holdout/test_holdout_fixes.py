"""Hidden second set for the answers to the phase 2 review.

Specified in specs/phase-2/SPEC-fixes.md, findings 1, 2, 4, 5 and 7. The cases and the
numbers differ from those in tests/unit, so an engine written to the unit tests alone
does not pass here.

Every expected date and count was worked out by hand. The working is beside it.
"""

import json
import sys
from collections.abc import Callable
from datetime import UTC, date, datetime
from pathlib import Path
from types import FrameType
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock, get_f1_pack, get_settings
from api.settings import Settings
from engine import f1
from engine.clocks import FixedClock
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    BLOCKED,
    OPERATIVE,
    TIME_ZONE,
    answered_yes,
    build_pack,
    cap_gap,
    case_problems,
    clock_on,
    contract_problems,
    count_days,
    dated_on_the_day,
    ead,
    items,
    job,
    pack_dict,
    reasons_with,
    settings_dict,
    values,
    with_changes,
    with_operative_status,
    with_regime_rows,
    with_the_about_asked,
)

TODAY = date(2025, 3, 14)  # a Friday
URL = "/v1/compute/f1"
API_NOON = datetime(2026, 9, 28, 12, 0, tzinfo=UTC)
JSON = {"content-type": "application/json"}
ENGINE_DIR = str(Path(f1.__file__).resolve().parent)

LATEST_START = "opt.latest_start_after_days"
WINDOW_CLOSES = "stem.apply_window_closes_rule"
RENAMED = "stem.final_evaluation_due_from_ead_end"
COUNTS = ("unemployment.days_used", "unemployment.days_remaining", "employment.days_under_hours")

# Case C: a December program end, OPT through the turn of the year.
CASE_C: dict[str, Any] = {
    "program_end_date": "2024-12-20",
    "time_zone": TIME_ZONE,
    "confirmations": answered_yes(),
    "degree_level": "bachelor",
    "documents_count": 4,
    "cpt_full_time_days": 30,
    "opt": ead("2024-10-01", "2024-10-10", "2025-01-15", "2026-01-14"),
    "stem": None,
    "employment": [job("2025-01-15", None, hours=32)],
    "cap_gap": None,
}

# Case D: OPT then STEM, seen while the extension runs.
CASE_D: dict[str, Any] = {
    "program_end_date": "2022-12-16",
    "time_zone": TIME_ZONE,
    "confirmations": answered_yes(),
    "degree_level": "doctorate",
    "documents_count": 9,
    "cpt_full_time_days": 0,
    "opt": ead("2022-10-03", "2022-10-20", "2023-02-01", "2024-01-31"),
    "stem": ead("2023-11-20", "2023-12-05", "2024-02-01", "2026-01-31"),
    "employment": [job("2023-02-01", None)],
    "cap_gap": None,
}


def run(
    case: dict[str, Any],
    today: date = TODAY,
    raw: dict[str, Any] | None = None,
    **pack_changes: Any,
) -> dict[str, Any]:
    assert case_problems(case) == [], "the test case itself must match the case contract"
    pack = build_pack(today, **pack_changes) if raw is None else validate_pack(raw)
    clock = clock_on(today)

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        return f1.compute_f1(f1.parse_case(sent, clock), pack, clock, settings=settings_dict())

    # SPEC-resolutions.md, point 7: an answer is sent with the about it was asked with.
    return compute(with_the_about_asked(dated_on_the_day(case, clock), compute))


def names_opt(output: dict[str, Any]) -> list[str]:
    return [
        r for r in reasons_with(output, "missing:") if r.removeprefix("missing:").startswith("opt")
    ]


@pytest.fixture
def client():
    # The shipped pack is read on the day the unit tests use. Some of its rules are not
    # in force on earlier days.
    app.dependency_overrides[get_clock] = lambda: FixedClock(API_NOON)
    app.dependency_overrides[get_settings] = lambda: Settings(
        database_url="postgresql+psycopg://duly:duly@127.0.0.1:1/duly"
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


# Finding 1


@pytest.mark.parametrize("opt", ["absent", "null"])
@pytest.mark.parametrize(
    "employment",
    [[], [job("2024-02-01", None)], [job("2024-02-01", "2024-06-30", hours=10, reported=False)]],
    ids=["none", "covered", "part_time_not_reported"],
)
def test_stem_without_opt_cannot_tell_whatever_the_employment(opt, employment):
    case = {k: v for k, v in CASE_D.items() if k != "opt"} | {"employment": employment}
    if opt == "null":
        case["opt"] = None
    out = run(case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert names_opt(out)
    got = items(out)
    assert all(got[item_id]["value"] is None for item_id in COUNTS if item_id in got)
    assert contract_problems(out) == []


@pytest.mark.parametrize("status", ["pending", "approved", "denied", "withdrawn"])
@pytest.mark.parametrize("change_of_status", [True, False])
def test_cap_gap_alone_cannot_tell_whatever_the_petition(status, change_of_status):
    case = with_changes(
        CASE_C,
        opt=None,
        employment=[],
        cap_gap=cap_gap("2025-10-01", status=status, change_of_status=change_of_status),
    )
    out = run(case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert names_opt(out)


def test_cap_gap_with_stem_and_no_opt_cannot_tell():
    out = run(with_changes(CASE_D, opt=None, cap_gap=cap_gap("2025-10-01")))
    assert out["verdict"]["state"] == "cannot_tell"
    assert names_opt(out)


def test_not_knowing_wins_over_a_judgement_item_when_opt_is_absent():
    # 400 days of full-time CPT would go to the DSO. The missing OPT block comes first.
    out = run(with_changes(CASE_D, opt=None, cpt_full_time_days=400))
    assert out["verdict"]["state"] == "cannot_tell"
    assert names_opt(out)


# Finding 2


@pytest.mark.parametrize("sent", [float("nan"), float("inf"), float("-inf")])
@pytest.mark.parametrize("position", [0, 1, 2, 3])
def test_parse_case_refuses_a_number_that_is_not_one_in_any_period(sent, position):
    periods = [job(f"2025-0{month}-01", f"2025-0{month}-20", hours=24) for month in (2, 3, 4, 5)]
    periods[position]["hours_per_week"] = sent
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(with_changes(CASE_C, employment=periods))


@pytest.mark.parametrize("sent", [float("nan"), float("inf"), float("-inf")])
def test_parse_case_refuses_it_in_a_case_with_no_opt(sent):
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(with_changes(CASE_C, opt=None, employment=[], documents_count=sent))


@pytest.mark.parametrize("token", ["NaN", "Infinity", "-Infinity"])
@pytest.mark.parametrize(
    "field", ["hours_per_week", "documents_count", "cpt_full_time_days", "degree_level", "opt"]
)
def test_the_api_refuses_the_token_wherever_it_stands(client, field, token):
    case = with_changes(CASE_C, employment=[job("2025-01-15", None, hours=32)])
    if field == "hours_per_week":
        case["employment"][0][field] = "MARK"
    else:
        case[field] = "MARK"
    body = json.dumps(case).replace('"MARK"', token).encode()
    response = client.post(URL, content=body, headers=JSON)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    assert response.json()["detail"].strip()
    assert "computed" not in response.text
    assert "Traceback" not in response.text


def test_the_api_gives_the_same_words_for_each_place_the_number_stands(client):
    # The refusal comes before the case is checked, so it cannot turn on the contract.
    first = with_changes(CASE_C, documents_count="MARK")
    second = with_changes(CASE_C, documents_count="MARK", degree_level="unknown", notes=1)
    sent = [json.dumps(c).replace('"MARK"', "NaN").encode() for c in (first, second)]
    got = [client.post(URL, content=body, headers=JSON) for body in sent]
    assert [r.status_code for r in got] == [422, 422]
    assert got[0].json()["detail"] == got[1].json()["detail"]


# Finding 4


def engine_steps(action: Callable[[], Any]) -> int:
    """How many lines of engine code run during the action."""
    steps = 0

    def watch(frame: FrameType, event: str, arg: Any) -> Any:
        nonlocal steps
        if not frame.f_code.co_filename.startswith(ENGINE_DIR):
            return None
        if event == "line":
            steps += 1
        return watch

    before = sys.gettrace()
    sys.settrace(watch)
    try:
        action()
    finally:
        sys.settrace(before)
    return steps


def long_case(first: str, last: str, program_end: str, periods: int) -> dict[str, Any]:
    return {
        "program_end_date": program_end,
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": "master",
        "documents_count": 1,
        "cpt_full_time_days": 0,
        "opt": ead(first, first, first, last),
        "employment": [
            job(first, None if number % 2 else last, hours=number) for number in range(periods)
        ],
    }


def test_the_work_does_not_grow_with_the_length_of_the_window():
    # The same 20 periods over 30 days and over 30 years.
    today = date(2060, 6, 30)
    pack = build_pack(today)
    clock = clock_on(today)
    chosen = settings_dict()

    def compute(case: dict[str, Any]) -> Callable[[], Any]:
        assert case_problems(case) == []
        parsed = f1.parse_case(case)
        return lambda: f1.compute_f1(parsed, pack, clock, settings=chosen)

    short = engine_steps(compute(long_case("2060-06-01", "2061-05-31", "2060-05-15", 20)))
    long = engine_steps(compute(long_case("2030-07-01", "2060-06-30", "2030-06-15", 20)))
    assert short > 0
    # 2030-07-01 through 2060-06-30 is 30 years, more than 10,900 days.
    assert long - short < 10900


def test_a_long_window_with_gaps_is_counted_right():
    # OPT 2030-07-01 through 2060-06-30, seen on the last day. Two periods:
    # 2030-07-11 through 2040-07-10 at 40 hours, and 2050-01-01 on at 10 hours.
    case = with_changes(
        long_case("2030-07-01", "2060-06-30", "2030-06-15", 0),
        employment=[job("2030-07-11", "2040-07-10"), job("2050-01-01", None, hours=10)],
    )
    today = date(2060, 6, 30)
    got = values(run(case, today=today))
    expected = count_days(case, today, 20, 20)
    # Used: Jul 1 through Jul 10 of 2030 is 10 days, then 2040-07-11 through 2049-12-31.
    # 2040-07-11 through 2049-07-10 is 9 years with leap days in 2044 and 2048: 3,287.
    # 2049-07-11 through 2049-12-31: 21 + 31 + 30 + 31 + 30 + 31 = 174. In all 3,471.
    assert expected["used"] == 3471
    assert got["unemployment.days_used"] == 3471
    # Under hours: 2050-01-01 through 2060-06-30. Ten years with leap days in 2052 and
    # 2056 is 3,652, and 2060-01-01 through 2060-06-30 in a leap year is 182: 3,834.
    assert expected["under"] == 3834
    assert got["employment.days_under_hours"] == 3834


@pytest.mark.parametrize(
    ("field", "sent"),
    [
        ("program_end_date", "2100-06-01"),
        ("program_end_date", "1949-06-01"),
        ("program_end_date", "9999-12-01"),
        ("program_end_date", "0001-01-15"),
    ],
)
def test_the_api_refuses_a_far_program_end(client, field, sent):
    response = client.post(URL, json=with_changes(CASE_C, **{field: sent}))
    assert response.status_code == 422
    assert field in response.json()["detail"]
    assert sent not in response.text


@pytest.mark.parametrize(("periods", "status"), [(49, 200), (50, 200), (51, 422), (500, 422)])
def test_the_api_takes_fifty_periods_and_no_more(client, periods, status):
    case = with_changes(CASE_C, employment=[job("2025-01-15", None)] * periods)
    assert client.post(URL, json=case).status_code == status


# Finding 5


def test_case_c_latest_start_and_window_under_their_own_rules():
    out = run(CASE_C, values={(LATEST_START, ""): 50, ("opt.apply_after_days", ""): 40})
    got = items(out)
    # program_end_date 2024-12-20 plus 50 days: 11 to Dec 31, 31 to Jan 31 (42), 8 to
    # Feb 8.
    assert got["opt.latest_start"]["value"] == "2025-02-08"
    assert got["opt.latest_start"]["rule_ids"] == [LATEST_START]
    # Plus 40 days: 11 to Dec 31, 29 to Jan 29.
    assert got["opt.apply_window_closes"]["value"] == "2025-01-29"
    assert LATEST_START not in got["opt.apply_window_closes"]["rule_ids"]
    assert out["rules"][LATEST_START]["value"] == 50


def test_case_d_stem_closing_and_final_evaluation():
    out = run(CASE_D)
    got = items(out)
    assert got["stem.apply_window_closes"]["value"] == "2024-01-31"
    assert got["stem.apply_window_closes"]["rule_ids"] == [WINDOW_CLOSES]
    assert out["rules"][WINDOW_CLOSES]["value"] is True
    # stem.ead_end 2026-01-31 plus 10 days.
    assert got[RENAMED]["value"] == "2026-02-10"
    assert "stem.final_evaluation_due" not in got


def test_case_d_without_the_closing_rule():
    out = run(CASE_D, leave_out=(WINDOW_CLOSES,))
    got = items(out)
    assert "stem.apply_window_closes" not in got
    assert WINDOW_CLOSES not in out["rules"]
    # opt.ead_end 2024-01-31 minus 90 days: back 31 to Dec 31, back 31 to Nov 30 (62),
    # back 28 to Nov 2.
    assert got["stem.apply_window_opens"]["value"] == "2023-11-02"
    assert contract_problems(out) == []


# Finding 7


@pytest.mark.parametrize("legal_status", ["appealed", "rescinded", "omb_review"])
@pytest.mark.parametrize("case", [CASE_C, CASE_D], ids=["case_c", "case_d"])
def test_operative_carries_the_status_the_pack_gives(case, legal_status):
    raw = with_regime_rows(pack_dict(TODAY), LATEST_START, operative=55, blocked=25)
    out = run(case, raw=with_operative_status(raw, legal_status))
    found = {i: item for i, item in items(out).items() if "alternates" in item}
    assert {"grace.ends", "opt.latest_start"} <= set(found)
    for item_id, item in found.items():
        assert item["operative"] == {"regime": OPERATIVE, "legal_status": legal_status}, item_id
        assert [a["regime"] for a in item["alternates"]] == [BLOCKED], item_id
    assert contract_problems(out) == []


def test_case_c_latest_start_under_each_regime():
    raw = with_regime_rows(pack_dict(TODAY), LATEST_START, operative=55, blocked=25)
    latest = items(run(CASE_C, raw=with_operative_status(raw, "appealed")))["opt.latest_start"]
    # program_end_date 2024-12-20 plus 55 days: 11 to Dec 31, 31 to Jan 31 (42), 13 to
    # Feb 13. Plus 25 days: 11 to Dec 31, 14 to Jan 14.
    assert latest["value"] == "2025-02-13"
    assert latest["alternates"] == [
        {"regime": BLOCKED, "legal_status": "enjoined", "value": "2025-01-14"}
    ]


def test_the_api_carries_the_operative_regime_of_the_shipped_pack(client):
    regime = next(r for r in get_f1_pack().regimes if r["operative"])
    out = client.post(URL, json=CASE_D).json()
    found = [item for item in items(out).values() if "alternates" in item]
    assert found
    for item in found:
        assert item["operative"] == {
            "regime": regime["id"],
            "legal_status": regime["legal_status"],
        }
