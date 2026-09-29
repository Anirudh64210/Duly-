"""Hidden second set for the context round.

Specified in specs/phase-2/SPEC-context.md, sections 2 to 5. The same rules as
tests/unit/engine/test_f1_context.py and tests/unit/api/test_compute_context.py, with
other cases, other instants, other zones and other numbers.

Two tests at the end take the place of two older hidden tests that the round made
impossible to pass. tests/PROGRESS.md, iteration 4, says which and why.
"""

import asyncio
from datetime import UTC, date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from api.main import app, get_clock, get_settings
from api.settings import Settings
from engine import f1
from engine.clocks import FixedClock
from engine.rulepack import validate_pack
from tests.support.api_client import CheckedClient, as_the_screen_sends
from tests.support.f1_pack import (
    CAP_GAP_ALONE,
    CONFLICT_IDS,
    CPT_USED,
    HELD_OPT,
    NO_EMPLOYMENT,
    NOTHING_MORE,
    QUESTION_IDS,
    READINGS,
    SHIFTED,
    answer_as_the_screen_does,
    answers,
    build_pack,
    cap_gap,
    case_problems,
    clock_at,
    clock_on,
    contract_problems,
    count_days,
    dated_on_the_day,
    ead,
    is_period_or_report_question,
    items,
    job,
    pack_dict,
    periods_answered,
    question_ids,
    reasons_with,
    refuse_placeholders,
    values,
    with_block,
    with_changes,
    with_derivation,
    with_the_about_asked,
)

URL = "/v1/compute/f1"
UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"

TODAY = date(2026, 3, 9)  # a Monday
COUNTS = (
    "unemployment.days_used",
    "unemployment.days_remaining",
    "employment.days_under_hours",
)

# Case H: OPT from 2025-07-14, one period through 2026-01-31.
CASE_H: dict[str, Any] = {
    "time_zone": "UTC",
    "program_end_date": "2025-06-06",
    "degree_level": "bachelor",
    "documents_count": 4,
    "cpt_full_time_days": 30,
    "opt": ead("2025-04-07", "2025-04-21", "2025-07-14", "2026-07-13"),
    "stem": None,
    "employment": [job("2025-07-14", "2026-01-31")],
    "cap_gap": None,
}

# Case K: OPT, then the STEM extension, one period that covers both.
CASE_K: dict[str, Any] = {
    "time_zone": "UTC",
    "program_end_date": "2023-12-15",
    "degree_level": "doctorate",
    "documents_count": 9,
    "cpt_full_time_days": 0,
    "opt": ead("2023-10-02", "2023-10-16", "2024-02-01", "2025-01-31"),
    "stem": ead("2024-11-04", "2024-11-18", "2025-02-01", "2027-01-31"),
    "employment": [job("2024-02-01", None, hours=32)],
    "cap_gap": None,
}

# SPEC-resolutions.md, point 20: the period begins on the STEM card; it is not with a new
# employer (periods_answered). The tests of this case are about held_post_completion_opt.
STEM_ALONE: dict[str, Any] = periods_answered(
    {
        "time_zone": "UTC",
        "program_end_date": "2024-12-13",
        "degree_level": "master",
        "documents_count": 1,
        "cpt_full_time_days": 0,
        "opt": None,
        "stem": ead("2025-11-03", "2025-11-17", "2026-02-01", "2028-01-31"),
        "employment": [job("2026-02-01", None, hours=25)],
    }
)

# SPEC-resolutions.md, point 22: the end of the period, 2025-03-28, was reported
# (periods_answered). The tests of this case are about cap_gap_without_training.
CAP_GAP_ALONE_CASE: dict[str, Any] = periods_answered(
    {
        "time_zone": "UTC",
        "program_end_date": "2026-05-08",
        "degree_level": "bachelor",
        "documents_count": 6,
        "cpt_full_time_days": 0,
        "employment": [job("2025-01-06", "2025-03-28", hours=12)],
        # Filed on 2026-03-02, a week before TODAY (2026-03-09): a filing dated after the day
        # of the case is a conflict of its own (specs/product-1/SPEC.md, section 1;
        # SPEC-resolutions.md, point 4), and this case is about the question alone.
        "cap_gap": cap_gap("2026-10-01", status="approved", petition_filed_on="2026-03-02"),
    }
)


def with_answers(case: dict[str, Any], given: dict[str, Any]) -> dict[str, Any]:
    """The case with the answers given added to those it holds (periods_answered)."""
    return with_changes(case, confirmations={**case.get("confirmations", {}), **given})


def run(
    case: dict[str, Any],
    today: date = TODAY,
    clock: Any = None,
    checked_on: str | date | None = None,
    raw_pack: dict[str, Any] | None = None,
    **pack_changes: Any,
) -> dict[str, Any]:
    assert case_problems(case) == [], "the test case itself must match the case contract"
    checked = checked_on or today
    pack = build_pack(checked, **pack_changes) if raw_pack is None else validate_pack(raw_pack)
    clock = clock or clock_on(today)

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        return f1.compute_f1(f1.parse_case(refuse_placeholders(sent), clock), pack, clock)

    # SPEC-resolutions.md, point 7: an answer is sent with the about it was asked with.
    return compute(with_the_about_asked(dated_on_the_day(case, clock), compute))


def unconfirmed(output: dict[str, Any]) -> list[str]:
    return [r.removeprefix("unconfirmed:") for r in reasons_with(output, "unconfirmed:")]


def no_count_is_a_number(output: dict[str, Any]) -> bool:
    got = items(output)
    return all(got[item_id]["value"] is None for item_id in COUNTS if item_id in got)


# Section 2: the person's own day


@pytest.mark.parametrize(
    ("instant", "zone", "expected", "used"),
    [
        # 23:10 UTC on 2026-03-08. From 2026-02-01, the day after the period: 28 days
        # in February, then the days of March.
        ("2026-03-08T23:10", "UTC", "2026-03-08", 36),
        ("2026-03-08T23:10", "Asia/Tokyo", "2026-03-09", 37),  # 9 ahead: 08:10
        ("2026-03-08T23:10", "Europe/Berlin", "2026-03-09", 37),  # 1 ahead: 00:10
        ("2026-03-08T23:10", "America/Denver", "2026-03-08", 36),  # 6 behind: 17:10
        ("2026-03-08T23:10", "Australia/Adelaide", "2026-03-09", 37),  # 10:30 ahead
        ("2026-03-08T23:10", "America/Indiana/Knox", "2026-03-08", 36),  # 5 behind
        # Chicago enters daylight time at 08:00 UTC on 2026-03-08. Before that it is 6
        # hours behind: 05:30 UTC is 23:30 on March 7. After, 5 behind: on March 9 at
        # 05:30 UTC it is 00:30 on March 9, where 6 behind would still give March 8.
        ("2026-03-08T05:30", "America/Chicago", "2026-03-07", 35),
        ("2026-03-09T05:30", "America/Chicago", "2026-03-09", 37),
        ("2026-03-09T04:59", "America/Chicago", "2026-03-08", 36),
    ],
)
def test_the_day_and_the_count_follow_the_zone(instant, zone, expected, used):
    case = with_changes(CASE_H, time_zone=zone)
    out = run(case, clock=clock_at(instant), checked_on=expected)
    assert out["today"] == {"date": expected, "time_zone": zone}
    assert values(out)["unemployment.days_used"] == used
    assert values(out)["unemployment.days_remaining"] == 90 - used
    assert items(out)["unemployment.days_used"]["inputs"]["today"] == expected
    assert contract_problems(out) == []


def test_the_count_under_a_pack_with_other_numbers_follows_the_zone():
    case = with_changes(CASE_H, time_zone="Asia/Tokyo")
    out = run(case, clock=clock_at("2026-03-08T23:10"), values=SHIFTED)
    # The limit in the second pack is 89.
    assert values(out)["unemployment.days_remaining"] == 89 - 37


class CountingClock:
    """A clock that counts how often each of its two methods is read."""

    def __init__(self, instant: datetime) -> None:
        self.instant = instant
        self.read_now = 0
        self.read_today = 0

    def now(self) -> datetime:
        self.read_now += 1
        return self.instant

    def today(self) -> date:
        self.read_today += 1
        return date(1999, 12, 31)


@pytest.mark.parametrize("case", [CASE_H, CASE_K, STEM_ALONE, CAP_GAP_ALONE_CASE])
def test_today_is_never_read_from_the_clock(case):
    clock = CountingClock(datetime(2026, 3, 8, 23, 10, tzinfo=UTC))
    out = run(with_changes(case, time_zone="Asia/Tokyo"), clock=clock, checked_on="2026-03-09")
    assert clock.read_today == 0
    assert clock.read_now >= 1
    assert out["today"]["date"] == "2026-03-09"
    assert "rules_stale" not in out["verdict"]["reasons"]


def test_the_rules_go_stale_on_the_persons_own_day():
    # Checked on 2026-03-01. At 23:10 UTC on 2026-03-08 it is the 8th in Denver, 7 days
    # on, and the 9th in Tokyo, 8 days on.
    instant = clock_at("2026-03-08T23:10")
    west = run(
        with_changes(CASE_K, time_zone="America/Denver"), clock=instant, checked_on="2026-03-01"
    )
    east = run(with_changes(CASE_K, time_zone="Asia/Tokyo"), clock=instant, checked_on="2026-03-01")
    assert "rules_stale" not in west["verdict"]["reasons"]
    assert "rules_stale" in east["verdict"]["reasons"]


@pytest.mark.parametrize(
    "zone", ["Europe/Paris_Texas", "Asia/Calcuta", "Moon/Tranquility", "America/Indiana/Nowhere"]
)
def test_parse_case_refuses_a_zone_nobody_lives_in(zone):
    sent = with_changes(CASE_K, time_zone=zone)
    assert case_problems(sent) == []
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(sent)


ZONES = (
    "UTC",
    "America/Anchorage",
    "America/Sao_Paulo",
    "America/St_Johns",
    "Europe/Kyiv",
    "Africa/Nairobi",
    "Asia/Tehran",
    "Asia/Kolkata",
    "Australia/Eucla",
    "Pacific/Chatham",
    "Pacific/Niue",
    "Pacific/Tongatapu",
)


@settings(max_examples=200, deadline=None)
@given(
    st.datetimes(min_value=datetime(2025, 7, 15), max_value=datetime(2026, 7, 12)),
    st.sampled_from(ZONES),
)
def test_for_any_instant_the_day_is_the_day_in_the_zone(instant, zone):
    moment = instant.replace(tzinfo=UTC)
    expected = moment.astimezone(ZoneInfo(zone)).date()
    case = with_changes(CASE_H, time_zone=zone)
    out = run(case, clock=FixedClock(moment), checked_on=expected)
    assert out["today"] == {"date": expected.isoformat(), "time_zone": zone}
    counted = count_days(case, expected, opt_min=20, stem_min=20)
    assert values(out)["unemployment.days_used"] == counted["used"]
    assert contract_problems(out) == []


# Section 3: a date blocks only while it can still matter


@pytest.mark.parametrize("part", ["opt", "stem"])
@pytest.mark.parametrize("filed", ["recorded", "not_recorded"])
def test_a_recommendation_date_does_not_block_a_block_with_its_ead(part, filed):
    changes: dict[str, Any] = {"dso_recommendation_date": None}
    if filed == "not_recorded":
        changes["i765_filed_date"] = None
    out = run(with_block(CASE_K, part, **changes))
    whole = run(CASE_K)
    assert reasons_with(out, "missing:") == []
    assert f"{part}.file_by" not in items(out)
    assert [r for r in out["verdict"]["reasons"] if "dso_recommendation_date" in r] == []
    assert [
        i["id"] for i in out["computed"] if f"{part}.dso_recommendation_date" in i["inputs"]
    ] == []
    expected = {k: v for k, v in values(whole).items() if k != f"{part}.file_by"}
    assert values(out) == expected
    assert out["verdict"] == whole["verdict"]


@pytest.mark.parametrize("part", ["opt", "stem"])
def test_with_a_filing_date_and_no_ead_start_only_the_ead_start_is_named(part):
    out = run(with_block(CASE_K, part, dso_recommendation_date=None, ead_start=None))
    assert out["verdict"]["state"] == "cannot_tell"
    assert reasons_with(out, "missing:") == [f"missing:{part}.ead_start"]
    assert f"{part}.file_by" not in items(out)


@pytest.mark.parametrize("part", ["opt", "stem"])
def test_with_nothing_recorded_after_it_the_recommendation_date_is_named(part):
    out = run(with_changes(CASE_K, **{part: ead(None, None, None, None)}))
    assert out["verdict"]["state"] == "cannot_tell"
    named = reasons_with(out, "missing:")
    assert f"missing:{part}.dso_recommendation_date" in named
    assert f"missing:{part}.ead_start" in named
    assert f"missing:{part}.ead_end" in named
    assert f"missing:{part}.i765_filed_date" not in named
    assert items(out)[f"{part}.file_by"]["value"] is None


def test_a_recommendation_date_that_still_matters_gives_a_date_under_each_pack():
    # Recommended on 2026-02-20, nothing recorded after it. Plus 30 days: 8 to Feb 28,
    # 22 to Mar 22. Plus 31 in the second pack: Mar 23.
    case = with_changes(CASE_H, opt=ead("2026-02-20", None, None, None), employment=[])
    assert values(run(case))["opt.file_by"] == "2026-03-22"
    assert values(run(case, values=SHIFTED))["opt.file_by"] == "2026-03-23"


@pytest.mark.parametrize("part", ["opt", "stem"])
def test_a_filing_date_is_never_a_missing_input(part):
    out = run(with_block(CASE_K, part, i765_filed_date=None))
    assert values(out) == values(run(CASE_K))
    assert out["verdict"] == run(CASE_K)["verdict"]
    assert reasons_with(out, "missing:") == []


# Section 4: confirm, never assume


def test_stem_alone_asks_and_waits():
    out = run(STEM_ALONE)
    assert question_ids(out) == [HELD_OPT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [HELD_OPT]
    assert [r for r in reasons_with(out, "missing:") if "opt" in r] == []
    assert no_count_is_a_number(out)
    assert out["questions"][0]["because"]
    assert contract_problems(out) == []


def test_stem_alone_answered_yes_names_both_opt_ead_dates():
    out = run(with_answers(STEM_ALONE, answers("2026-03-02", **{HELD_OPT: True})))
    assert out["questions"] == []
    assert out["verdict"]["state"] == "cannot_tell"
    assert {"missing:opt.ead_start", "missing:opt.ead_end"} <= set(out["verdict"]["reasons"])
    assert unconfirmed(out) == []


def test_stem_alone_answered_no_is_for_the_dso_with_the_words_of_the_law():
    raw = pack_dict(TODAY)
    case = with_answers(STEM_ALONE, answers("2026-03-02", **{HELD_OPT: False}))
    out = run(case, raw_pack=raw)
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "stem_without_post_completion_opt" in out["verdict"]["reasons"]
    assert reasons_with(out, "missing:") == []
    assert out["questions"] == []
    flag = "stem.requires_post_completion_opt"
    source = next(p for p in raw["parameters"] if p["id"] == flag)["source"]
    assert out["rules"][flag]["quote"] == source["quote"]
    assert out["rules"][flag]["derivation"] == "verbatim"
    assert no_count_is_a_number(out)
    assert contract_problems(out) == []


def test_cap_gap_alone_asks_and_each_answer_is_followed():
    out = run(CAP_GAP_ALONE_CASE)
    assert question_ids(out) == [CAP_GAP_ALONE]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [CAP_GAP_ALONE]
    yes = run(with_answers(CAP_GAP_ALONE_CASE, answers(**{CAP_GAP_ALONE: True})))
    assert yes["verdict"]["state"] == "cannot_tell"
    assert "missing:opt.ead_end" in yes["verdict"]["reasons"]
    assert yes["questions"] == []
    no = run(with_answers(CAP_GAP_ALONE_CASE, answers(**{CAP_GAP_ALONE: False})))
    assert no["verdict"]["state"] == "talk_to_dso"
    assert "cap_gap_without_training" in no["verdict"]["reasons"]
    assert no["questions"] == []


@pytest.mark.parametrize(
    ("today", "asked"),
    [(date(2025, 7, 13), False), (date(2025, 7, 14), True), (date(2026, 3, 9), True)],
)
def test_an_empty_list_is_asked_about_from_the_first_day_of_opt(today, asked):
    out = run(with_changes(CASE_H, employment=[]), today=today)
    assert (NO_EMPLOYMENT in question_ids(out)) is asked
    assert (NO_EMPLOYMENT in unconfirmed(out)) is asked
    if asked:
        assert out["verdict"]["state"] == "cannot_tell"
        assert no_count_is_a_number(out)


def test_an_empty_list_answered_yes_is_counted_day_by_day():
    # OPT from 2025-07-14. Through 2025-09-30: 18 in July, 31 in August, 30 in
    # September.
    today = date(2025, 9, 30)
    case = with_changes(CASE_H, employment=[], confirmations=answers(**{NO_EMPLOYMENT: True}))
    out = run(case, today=today)
    assert values(out)["unemployment.days_used"] == 79
    assert values(out)["unemployment.days_remaining"] == 11
    assert out["questions"] == []
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}


def test_an_empty_list_answered_no_is_a_missing_input():
    case = with_changes(CASE_H, employment=[], confirmations=answers(**{NO_EMPLOYMENT: False}))
    out = run(case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:employment" in out["verdict"]["reasons"]
    assert out["questions"] == []
    assert no_count_is_a_number(out)


@pytest.mark.parametrize("answer", [True, False])
def test_answers_nobody_asked_for_change_nothing(answer):
    given = answers("2025-08-01", **dict.fromkeys(QUESTION_IDS, answer))
    assert run(with_changes(CASE_K, confirmations=given)) == run(CASE_K)


@st.composite
def records(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    program_end = draw(st.dates(min_value=date(2023, 6, 1), max_value=date(2026, 6, 30)))
    opt_start = program_end + timedelta(days=draw(st.integers(min_value=1, max_value=55)))
    opt_end = opt_start + timedelta(days=364)
    stem_start = opt_end + timedelta(days=1)
    today = opt_start + timedelta(days=draw(st.integers(min_value=-30, max_value=1090)))
    case: dict[str, Any] = {
        "time_zone": "UTC",
        "program_end_date": program_end.isoformat(),
        "degree_level": "master",
        "documents_count": draw(st.integers(min_value=1, max_value=9)),
        "cpt_full_time_days": 0,
        "opt": ead(None, None, opt_start.isoformat(), opt_end.isoformat()),
        "stem": ead(
            None,
            draw(st.sampled_from([None, opt_end.isoformat()])),
            stem_start.isoformat(),
            (stem_start + timedelta(days=729)).isoformat(),
        ),
        "employment": [job(opt_start.isoformat(), None, hours=draw(st.sampled_from([15, 35])))],
        "cap_gap": cap_gap((today + timedelta(days=200)).isoformat(), status="pending"),
    }
    for part in draw(st.lists(st.sampled_from(["opt", "stem", "cap_gap"]), unique=True)):
        case[part] = None
    if draw(st.booleans()):
        case["employment"] = []
    given = draw(st.dictionaries(st.sampled_from(QUESTION_IDS), st.booleans()))
    if given:
        case["confirmations"] = answers(today.isoformat(), **given)
    return case, today


@settings(max_examples=500, deadline=None)
@given(records())
def test_a_record_with_a_gap_is_asked_about_and_never_called_quiet(drawn):
    case, today = drawn
    out = run(case, today=today)
    assert contract_problems(out) == []
    # specs/product-1/SPEC.md, sections 1 and 2: the engine now asks two more questions,
    # and one for each conflict, whose reason is conflict:<id>. Those have their own
    # property in the product tests. This one keeps to the questions of its round.
    # SPEC-resolutions.md, points 20, 21 and 22 add the questions of a period and of a
    # passed report; each is unconfirmed and the verdict cannot_tell until it is answered.
    # They have their own tests in test_holdout_periods_and_reports.py.
    later = [q for q in question_ids(out) if is_period_or_report_question(q)]
    assert set(later) <= set(unconfirmed(out))
    if later:
        assert out["verdict"]["state"] == "cannot_tell"
    asked = [q for q in question_ids(out) if q not in CONFLICT_IDS and q not in later]
    given = case.get("confirmations", {})
    assert sorted(q for q in unconfirmed(out) if q not in later) == sorted(asked)
    assert set(asked) <= {*QUESTION_IDS, NOTHING_MORE, CPT_USED}
    assert set(asked).isdisjoint(given)
    state = out["verdict"]["state"]
    if asked:
        assert state == "cannot_tell"
    opt, stem = case["opt"], case["stem"]
    if stem and not opt:
        assert HELD_OPT in asked or HELD_OPT in given
        assert state != "no_open_items"
        assert state != "needs_you"
    if case["cap_gap"] and not opt and not stem:
        assert CAP_GAP_ALONE in asked or CAP_GAP_ALONE in given
        assert state != "no_open_items"
        assert state != "needs_you"
    if opt and not case["employment"] and today >= date.fromisoformat(opt["ead_start"]):
        assert NO_EMPLOYMENT in asked or NO_EMPLOYMENT in given
        if state != "cannot_tell":
            assert given[NO_EMPLOYMENT]["answer"] is True
    # No recommendation date is entered anywhere, and every block holds its EAD dates.
    assert [r for r in out["verdict"]["reasons"] if "dso_recommendation_date" in r] == []


# Section 5: rules shown with their derivation


def test_each_rule_shown_is_marked_as_the_pack_marks_it():
    note = "placeholder note written by the hidden test alone"
    raw = with_derivation(pack_dict(TODAY), "stem.validation_interval_months", "reading", note)
    raw = with_derivation(raw, "cpt.full_time_bar_days", "verbatim")
    out = run(CASE_K, raw_pack=raw)
    marked = {p["id"]: p for p in raw["parameters"]}
    assert out["rules"]
    for rule_id, shown in out["rules"].items():
        assert shown["derivation"] == marked[rule_id]["derivation"], rule_id
        if shown["derivation"] == "reading":
            assert shown["note"] == marked[rule_id]["note"], rule_id
            assert shown["quote"] == marked[rule_id]["source"]["quote"], rule_id
        else:
            assert "note" not in shown, rule_id
    assert out["rules"]["stem.validation_interval_months"]["note"] == note
    assert out["rules"]["cpt.full_time_bar_days"]["derivation"] == "verbatim"
    assert out["rules"]["cpt.full_time_months_bar"]["note"] == READINGS["cpt.full_time_months_bar"]
    assert values(out) == values(run(CASE_K))
    assert contract_problems(out) == []


# The api


@pytest.fixture
def client():
    app.dependency_overrides[get_clock] = lambda: FixedClock(
        datetime(2026, 9, 28, 23, 10, tzinfo=UTC)
    )
    app.dependency_overrides[get_settings] = lambda: Settings(database_url=UNREACHABLE)
    yield CheckedClient(app)
    app.dependency_overrides.clear()


API_CASE: dict[str, Any] = {
    "time_zone": "Asia/Tokyo",
    "program_end_date": "2026-05-22",
    "degree_level": "master",
    "documents_count": 8,
    "cpt_full_time_days": 0,
    "opt": ead("2026-03-16", "2026-03-30", "2026-06-15", "2027-06-14"),
    "employment": [job("2026-06-15", "2026-09-10", hours=30)],
}


def test_the_api_counts_on_the_persons_own_day(client):
    # 23:10 UTC on 2026-09-28 is 08:10 on the 29th in Tokyo and 17:10 on the 28th in
    # Denver. From 2026-09-11 on: 19 days through the 29th, 18 through the 28th.
    # SPEC-resolutions.md, point 22: the end of the period, 2026-09-10, was reported. The
    # answer is sent as the screen sends it, with the about the api asked, dated on the
    # person's own day at the api's clock.
    clock = FixedClock(datetime(2026, 9, 28, 23, 10, tzinfo=UTC))
    tokyo = as_the_screen_sends(client, URL, periods_answered(API_CASE), clock)
    denver = with_changes(API_CASE, time_zone="America/Denver")
    denver = as_the_screen_sends(client, URL, periods_answered(denver), clock)
    east = client.post(URL, json=tokyo)
    west = client.post(URL, json=denver)
    assert east.status_code == 200
    assert west.status_code == 200
    assert east.json()["today"] == {"date": "2026-09-29", "time_zone": "Asia/Tokyo"}
    assert west.json()["today"] == {"date": "2026-09-28", "time_zone": "America/Denver"}
    assert items(east.json())["unemployment.days_used"]["value"] == 19
    assert items(west.json())["unemployment.days_used"]["value"] == 18
    assert east.json()["questions"] == []
    assert contract_problems(east.json()) == []


@pytest.mark.parametrize("zone", ["Moon/Tranquility", "Asia/Calcuta", None, "", "JST", 9])
def test_the_api_refuses_a_zone_it_cannot_read(client, zone):
    response = client.post(URL, json=with_changes(API_CASE, time_zone=zone))
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, str)
    assert detail.strip()
    assert "Traceback" not in response.text
    assert "computed" not in response.text
    if isinstance(zone, str) and zone:
        assert zone not in response.text


def test_the_api_asks_and_follows_the_answer(client):
    case = with_changes(API_CASE, employment=[])
    asked = client.post(URL, json=case).json()
    assert question_ids(asked) == [NO_EMPLOYMENT]
    assert asked["verdict"]["state"] == "cannot_tell"
    assert f"unconfirmed:{NO_EMPLOYMENT}" in asked["verdict"]["reasons"]
    # The answer no, dated 2026-09-29, the day in Tokyo (23:10 UTC on 2026-09-28 is 08:10
    # on 2026-09-29 there), with the about the api asked (SPEC-resolutions.md, point 7).
    no = answer_as_the_screen_does(case, asked, "2026-09-29", **{NO_EMPLOYMENT: False})
    answered = client.post(URL, json=no).json()
    assert answered["questions"] == []
    assert "missing:employment" in answered["verdict"]["reasons"]
    assert contract_problems(answered) == []


# In place of two older hidden tests


class WatchingClock:
    """A fixed clock that notes, each time it is read, whether the thread that reads it
    is running an event loop."""

    def __init__(self, instant: datetime) -> None:
        self.instant = instant
        self.read_on_the_event_loop: list[bool] = []

    def _note(self) -> None:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            self.read_on_the_event_loop.append(False)
        else:
            self.read_on_the_event_loop.append(True)

    def now(self) -> datetime:
        self._note()
        return self.instant

    def today(self) -> date:
        self._note()
        return self.instant.date()


def test_the_api_reads_the_instant_off_the_event_loop(client):
    clock = WatchingClock(datetime(2026, 9, 28, 23, 10, tzinfo=UTC))
    app.dependency_overrides[get_clock] = lambda: clock
    assert client.post(URL, json=API_CASE).status_code == 200
    assert clock.read_on_the_event_loop
    assert not any(clock.read_on_the_event_loop)


EAD_DATES = (("opt", "ead_start"), ("opt", "ead_end"), ("stem", "ead_start"), ("stem", "ead_end"))


@settings(max_examples=200, deadline=None)
@given(
    st.integers(min_value=0, max_value=700),
    st.lists(st.sampled_from(EAD_DATES), min_size=1, unique=True),
    st.booleans(),
)
def test_a_null_ead_date_never_gets_the_quiet_verdict(days, emptied, no_recommendation):
    today = date(2025, 2, 1) + timedelta(days=days)
    case = CASE_K
    for part, field in emptied:
        case = with_block(case, part, **{field: None})
    if no_recommendation:
        case = with_block(case, "stem", dso_recommendation_date=None)
    out = run(case, today=today)
    assert out["verdict"]["state"] == "cannot_tell"
    for part, field in emptied:
        assert f"missing:{part}.{field}" in out["verdict"]["reasons"]
    assert contract_problems(out) == []
