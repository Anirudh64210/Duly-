"""engine/f1.py after the context round.

Specified in specs/phase-2/SPEC-context.md, sections 2 to 5, PRINCIPLES.md, and
DECISIONS.md D32 to D35:
  2. The person's own day. Today is clock.now() seen from the case's time zone.
  3. A date blocks only while it can still matter.
  4. Confirm, never assume. The engine asks, and cannot tell until the person answers.
  5. Each rule shown carries its derivation, and a reading carries its note.

Every expected date and count was worked out by hand. The working is beside it.
The zones in the property tests are read with zoneinfo from the standard library, which
is no part of the engine.

Where the SPEC leaves a point open, the tests say which side they take, and the point is
listed in tests/PROGRESS.md under "Questions".
"""

from datetime import UTC, date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.clocks import FixedClock
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    CAP_GAP_ALONE,
    CONFLICT_IDS,
    CPT_USED,
    HELD_OPT,
    NO_EMPLOYMENT,
    NOTHING_MORE,
    QUESTION_IDS,
    READINGS,
    answered_yes,
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
    items,
    job,
    pack_dict,
    question_ids,
    reasons_with,
    rule_value,
    values,
    with_block,
    with_changes,
    with_derivation,
    with_the_about_asked,
)

TODAY = date(2026, 9, 28)  # a Monday
CHECKED_ON = "2026-09-28"

COUNTS = (
    "unemployment.days_used",
    "unemployment.days_remaining",
    "employment.days_under_hours",
)

# The case fields a question can name as what raised it.
CASE_FIELDS = ("opt", "stem", "employment", "cap_gap")

# Case A: post-completion OPT, no STEM, no cap-gap. Nothing is open on 2026-09-28.
# No question is raised, so the case carries no answer.
CASE_A: dict[str, Any] = {
    "program_end_date": "2026-05-15",
    "degree_level": "master",
    "documents_count": 3,
    "cpt_full_time_days": 0,
    "opt": ead("2026-03-02", "2026-03-10", "2026-06-01", "2027-05-31"),
    "stem": None,
    "employment": [job("2026-06-01", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}

# Case B: OPT followed by the STEM extension, with a cap-gap petition.
CASE_B: dict[str, Any] = {
    "program_end_date": "2024-05-10",
    "degree_level": "master",
    "documents_count": 5,
    "cpt_full_time_days": 100,
    "opt": ead("2024-03-01", "2024-03-15", "2024-07-01", "2025-06-30"),
    "stem": ead("2025-04-15", "2025-05-01", "2025-07-01", "2027-06-30"),
    "employment": [job("2024-07-01", None)],
    "cap_gap": cap_gap("2026-10-01", petition_filed_on="2026-04-02"),
    "time_zone": "UTC",
}

# PRINCIPLES.md, 2: STEM OPT dates entered with no OPT dates. The period covers every
# day since the STEM start, so the only gap in the record is the OPT block.
STEM_ONLY: dict[str, Any] = {
    "program_end_date": "2026-05-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "employment": [job("2026-06-01", None)],
    "stem": ead("2026-04-01", "2026-04-20", "2026-06-01", "2028-05-31"),
    "time_zone": "UTC",
}

# Cap-gap entered with neither OPT nor STEM. The program ends after 2026-09-28, so the
# grace period has not begun and the verdict does not turn on the rule in litigation.
CAP_GAP_ONLY: dict[str, Any] = {
    "program_end_date": "2026-12-18",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "employment": [],
    "cap_gap": cap_gap("2026-10-01"),
    "time_zone": "UTC",
}

# Case A with nothing entered under employment. OPT starts on 2026-06-01.
NO_JOBS: dict[str, Any] = with_changes(CASE_A, employment=[])


def run(
    case: dict[str, Any],
    today: date = TODAY,
    clock: Any = None,
    checked_on: str | date = CHECKED_ON,
    raw_pack: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compute a case. The clock stands at noon UTC on today unless one is passed."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    pack = build_pack(checked_on) if raw_pack is None else validate_pack(raw_pack)
    clock = clock or clock_on(today)

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        return f1.compute_f1(f1.parse_case(sent, clock), pack, clock)

    # SPEC-resolutions.md, point 7: an answer is sent with the about it was asked with.
    return compute(with_the_about_asked(dated_on_the_day(case, clock), compute))


def in_zone(case: dict[str, Any], zone: str) -> dict[str, Any]:
    return with_changes(case, time_zone=zone)


def answered(case: dict[str, Any], on: str = "2026-09-28", **given: bool) -> dict[str, Any]:
    return with_changes(case, confirmations=answers(on, **given))


def unconfirmed(output: dict[str, Any]) -> list[str]:
    return [r.removeprefix("unconfirmed:") for r in reasons_with(output, "unconfirmed:")]


def names_opt(output: dict[str, Any]) -> list[str]:
    """The reasons that name the OPT block, or a date in it, as missing."""
    return [
        r for r in reasons_with(output, "missing:") if r.removeprefix("missing:").startswith("opt")
    ]


def no_count_is_a_number(output: dict[str, Any]) -> bool:
    got = items(output)
    return all(got[item_id]["value"] is None for item_id in COUNTS if item_id in got)


def said_anywhere(output: dict[str, Any], name: str) -> list[str]:
    """Every place the output speaks of an input: a reason, or the inputs of an item."""
    found = [r for r in output["verdict"]["reasons"] if name in r]
    found += [item["id"] for item in output["computed"] if name in item["inputs"]]
    return found


class NoTodayClock:
    """A clock whose today() may not be read. SPEC-context, section 2: the engine never
    calls clock.today()."""

    def __init__(self, instant: datetime) -> None:
        self.instant = instant

    def now(self) -> datetime:
        return self.instant

    def today(self) -> date:
        raise AssertionError("the engine read clock.today()")


class OtherDayClock:
    """A clock whose today() gives a day that no zone has at the instant of now()."""

    def __init__(self, instant: datetime) -> None:
        self.instant = instant

    def now(self) -> datetime:
        return self.instant

    def today(self) -> date:
        return date(2031, 1, 1)


# Section 2: the person's own day

# SPEC-context, section 2, "Test": 01:30 UTC on 2026-09-29.
EARLY = "2026-09-29T01:30"

# OPT from 2026-06-01, one period through 2026-08-31. Every day from 2026-09-01 on is a
# day without an employer.
SEPTEMBER: dict[str, Any] = with_changes(CASE_A, employment=[job("2026-06-01", "2026-08-31")])


def test_at_0130_utc_los_angeles_counts_through_the_28th_and_kolkata_through_the_29th():
    # Los Angeles is 7 hours behind UTC in September: 18:30 on 2026-09-28.
    west = run(in_zone(SEPTEMBER, "America/Los_Angeles"), clock=clock_at(EARLY))
    # Kolkata is 5 hours 30 minutes ahead of UTC: 07:00 on 2026-09-29.
    east = run(in_zone(SEPTEMBER, "Asia/Kolkata"), clock=clock_at(EARLY))
    # 2026-09-01 through 2026-09-28 is 28 days, through 2026-09-29 is 29.
    assert values(west)["unemployment.days_used"] == 28
    assert values(east)["unemployment.days_used"] == 29
    # The limit is 90: 90 - 28 = 62, 90 - 29 = 61.
    assert values(west)["unemployment.days_remaining"] == 62
    assert values(east)["unemployment.days_remaining"] == 61
    assert contract_problems(west) == []
    assert contract_problems(east) == []


def test_the_output_carries_the_date_used_and_the_zone():
    west = run(in_zone(SEPTEMBER, "America/Los_Angeles"), clock=clock_at(EARLY))
    east = run(in_zone(SEPTEMBER, "Asia/Kolkata"), clock=clock_at(EARLY))
    assert west["today"] == {"date": "2026-09-28", "time_zone": "America/Los_Angeles"}
    assert east["today"] == {"date": "2026-09-29", "time_zone": "Asia/Kolkata"}


def test_the_day_shown_as_an_input_of_a_count_is_the_persons_own_day():
    west = items(run(in_zone(SEPTEMBER, "America/Los_Angeles"), clock=clock_at(EARLY)))
    east = items(run(in_zone(SEPTEMBER, "Asia/Kolkata"), clock=clock_at(EARLY)))
    for item_id in COUNTS:
        assert west[item_id]["inputs"]["today"] == "2026-09-28", item_id
        assert east[item_id]["inputs"]["today"] == "2026-09-29", item_id


@pytest.mark.parametrize(
    ("instant", "zone", "expected"),
    [
        # 01:30 UTC on 2026-09-29.
        (EARLY, "UTC", "2026-09-29"),
        (EARLY, "America/New_York", "2026-09-28"),  # 4 hours behind: 21:30 on the 28th
        (EARLY, "Europe/London", "2026-09-29"),  # 1 hour ahead: 02:30
        (EARLY, "America/Argentina/Buenos_Aires", "2026-09-28"),  # 3 behind: 22:30
        (EARLY, "Pacific/Pago_Pago", "2026-09-28"),  # 11 behind: 14:30
        (EARLY, "Pacific/Kiritimati", "2026-09-29"),  # 14 ahead: 15:30
        # 10:30 UTC on 2026-09-28: two zones a whole day apart, each just past midnight.
        ("2026-09-28T10:30", "Pacific/Honolulu", "2026-09-28"),  # 10 behind: 00:30
        ("2026-09-28T10:30", "Pacific/Kiritimati", "2026-09-29"),  # 14 ahead: 00:30
        # One minute each side of midnight in Kolkata, which is 18:30 UTC.
        ("2026-09-28T18:29", "Asia/Kolkata", "2026-09-28"),
        ("2026-09-28T18:30", "Asia/Kolkata", "2026-09-29"),
        # Kathmandu is 5 hours 45 minutes ahead: midnight is 18:15 UTC.
        ("2026-09-28T18:14", "Asia/Kathmandu", "2026-09-28"),
        ("2026-09-28T18:15", "Asia/Kathmandu", "2026-09-29"),
        # Los Angeles leaves daylight time at 09:00 UTC on 2026-11-01. Before that it is
        # 7 hours behind, so 07:30 UTC is 00:30 on November 1. At 8 hours behind it would
        # still be October 31.
        ("2026-11-01T07:30", "America/Los_Angeles", "2026-11-01"),
        ("2026-11-01T06:59", "America/Los_Angeles", "2026-10-31"),
        # In winter it is 8 hours behind: 07:30 UTC is 23:30 the day before.
        ("2026-12-10T07:30", "America/Los_Angeles", "2026-12-09"),
        ("2026-12-10T08:00", "America/Los_Angeles", "2026-12-10"),
    ],
)
def test_today_is_the_calendar_day_in_the_zone_of_the_case(instant, zone, expected):
    out = run(in_zone(SEPTEMBER, zone), clock=clock_at(instant), checked_on=expected)
    assert out["today"] == {"date": expected, "time_zone": zone}
    # An open count runs through that day. From 2026-09-01, the day after the period.
    days = (date.fromisoformat(expected) - date(2026, 8, 31)).days
    assert values(out)["unemployment.days_used"] == days


def test_the_instant_may_be_written_in_any_zone():
    # 18:30 on 2026-09-28 in Los Angeles is 01:30 UTC on 2026-09-29. The clock's own
    # zone decides nothing: the day is the day in the zone of the case.
    instant = datetime(2026, 9, 28, 18, 30, tzinfo=ZoneInfo("America/Los_Angeles"))
    assert instant == datetime(2026, 9, 29, 1, 30, tzinfo=UTC)
    out = run(in_zone(SEPTEMBER, "Asia/Kolkata"), clock=FixedClock(instant))
    assert out["today"]["date"] == "2026-09-29"
    assert out == run(in_zone(SEPTEMBER, "Asia/Kolkata"), clock=clock_at(EARLY))


@pytest.mark.parametrize("zone", ["America/Los_Angeles", "UTC", "Asia/Kolkata"])
def test_the_engine_never_reads_today_from_the_clock(zone):
    instant = datetime(2026, 9, 29, 1, 30, tzinfo=UTC)
    case = in_zone(CASE_B, zone)
    out = run(case, clock=NoTodayClock(instant))
    assert out == run(case, clock=FixedClock(instant))
    assert out == run(case, clock=OtherDayClock(instant))


def test_the_age_of_the_rules_is_counted_from_the_persons_own_day():
    # engine/verdict.py: the rules are stale when checked more than 7 days before today.
    # Checked on 2026-09-21. In Los Angeles it is the 28th, 7 days on. In Kolkata it is
    # the 29th, 8 days on.
    west = run(
        in_zone(CASE_A, "America/Los_Angeles"), clock=clock_at(EARLY), checked_on="2026-09-21"
    )
    east = run(in_zone(CASE_A, "Asia/Kolkata"), clock=clock_at(EARLY), checked_on="2026-09-21")
    assert "rules_stale" not in west["verdict"]["reasons"]
    assert "rules_stale" in east["verdict"]["reasons"]
    assert east["verdict"]["state"] == "cannot_tell"


def test_an_item_is_open_on_the_persons_own_day():
    # opt.apply_window_closes is program_end_date 2026-05-15 plus 60 days: 16 to May 31,
    # 30 to Jun 30, 14 to Jul 14. It is an open item from today through 14 days on.
    # At 01:30 UTC on 2026-07-15 it is still July 14 in Los Angeles, and July 15 in
    # Kolkata, the day after.
    instant = "2026-07-15T01:30"
    case = with_changes(CASE_A, employment=[job("2026-06-01", None)])
    west = run(
        in_zone(case, "America/Los_Angeles"), clock=clock_at(instant), checked_on="2026-07-14"
    )
    east = run(in_zone(case, "Asia/Kolkata"), clock=clock_at(instant), checked_on="2026-07-14")
    assert values(west)["opt.apply_window_closes"] == "2026-07-14"
    assert "opt.apply_window_closes" in west["verdict"]["reasons"]
    assert "opt.apply_window_closes" not in east["verdict"]["reasons"]


def test_a_date_that_does_not_turn_on_today_is_the_same_in_every_zone():
    west = values(run(in_zone(CASE_B, "America/Los_Angeles"), clock=clock_at(EARLY)))
    east = values(run(in_zone(CASE_B, "Asia/Kolkata"), clock=clock_at(EARLY)))
    turn_on_today = {*COUNTS, "unemployment.limit"}
    for item_id in west:
        if item_id not in turn_on_today:
            assert west[item_id] == east[item_id], item_id


KNOWN_ZONES = (
    "UTC",
    "America/Los_Angeles",
    "America/New_York",
    "America/Chicago",
    "America/Argentina/Buenos_Aires",
    "America/Indiana/Indianapolis",
    "Europe/London",
    "Africa/Lagos",
    "Asia/Kolkata",
    "Asia/Kathmandu",
    "Asia/Shanghai",
    "Australia/Lord_Howe",
    "Pacific/Pago_Pago",
    "Pacific/Kiritimati",
    "Etc/GMT+12",
    "Etc/GMT-14",
)

# Each matches the pattern in contracts/case_f1.schema.json and names no zone.
UNKNOWN_ZONES = (
    "Mars/Olympus_Mons",
    "America/Los_Angelos",
    "Europe/Atlantis",
    "Asia/Kolkata/North",
    "Pacific/Standard",
    "Etc/GMT+15",
)


@pytest.mark.parametrize("zone", KNOWN_ZONES)
def test_parse_case_takes_a_zone_that_exists_and_keeps_its_name(zone):
    assert case_problems(in_zone(CASE_A, zone)) == []
    case = f1.parse_case(in_zone(CASE_A, zone))
    assert case.time_zone == zone
    out = f1.compute_f1(case, build_pack(CHECKED_ON), clock_on(TODAY))
    assert out["today"]["time_zone"] == zone


@pytest.mark.parametrize("zone", UNKNOWN_ZONES)
def test_parse_case_refuses_a_zone_that_does_not_exist(zone):
    sent = in_zone(CASE_A, zone)
    assert case_problems(sent) == [], "the contract alone does not catch this zone"
    with pytest.raises(ValueError):  # noqa: PT011
        f1.parse_case(sent)


def test_parse_case_refuses_an_unknown_zone_whatever_else_the_case_holds():
    for case in (CASE_B, STEM_ONLY, CAP_GAP_ONLY, NO_JOBS):
        with pytest.raises(ValueError):  # noqa: PT011
            f1.parse_case(in_zone(case, "Mars/Olympus_Mons"))


@settings(max_examples=200, deadline=None)
@given(
    st.datetimes(min_value=datetime(2026, 6, 1), max_value=datetime(2027, 5, 31, 23, 59)),
    st.sampled_from(KNOWN_ZONES),
)
def test_for_any_instant_and_zone_today_is_the_day_in_that_zone(instant, zone):
    moment = instant.replace(tzinfo=UTC)
    expected = moment.astimezone(ZoneInfo(zone)).date()
    case = in_zone(SEPTEMBER, zone)
    out = run(case, clock=FixedClock(moment), checked_on=expected)
    assert out["today"] == {"date": expected.isoformat(), "time_zone": zone}
    # The zones run from 12 hours behind UTC to 14 ahead.
    assert moment.date() - timedelta(days=1) <= expected <= moment.date() + timedelta(days=1)
    counted = count_days(case, expected, opt_min=20, stem_min=20)
    assert values(out)["unemployment.days_used"] == counted["used"]
    assert values(out)["employment.days_under_hours"] == counted["under"]
    assert contract_problems(out) == []


# Section 3: a date blocks only while it can still matter

PARTS = ("opt", "stem")

# Which of the filing date and the EAD start is recorded when the recommendation date
# is absent. The EAD end is always recorded, so the case has no other gap.
RECORDED: dict[str, dict[str, Any]] = {
    "filing_date_and_ead_start": {},
    "filing_date_alone_is_not_enough_for_the_ead": {"i765_filed_date": None},
}


@pytest.mark.parametrize("part", PARTS)
def test_a_recommendation_date_does_not_block_once_the_filing_and_the_ead_are_recorded(part):
    # D32. Case B records a filing date and both EAD dates for OPT and for STEM.
    out = run(with_block(CASE_B, part, dso_recommendation_date=None))
    assert reasons_with(out, "missing:") == []
    assert f"{part}.file_by" not in items(out)
    assert said_anywhere(out, f"{part}.dso_recommendation_date") == []
    assert contract_problems(out) == []


@pytest.mark.parametrize("part", PARTS)
def test_a_recommendation_date_does_not_block_once_the_ead_start_alone_is_recorded(part):
    out = run(with_block(CASE_B, part, dso_recommendation_date=None, i765_filed_date=None))
    assert reasons_with(out, "missing:") == []
    assert f"{part}.file_by" not in items(out)
    assert said_anywhere(out, f"{part}.dso_recommendation_date") == []


@pytest.mark.parametrize("part", PARTS)
def test_a_recommendation_date_does_not_block_once_the_filing_date_alone_is_recorded(part):
    # The filing date is recorded, the EAD start is not. The recommendation date has
    # stopped mattering. The EAD start of a block that is present always matters.
    out = run(with_block(CASE_B, part, dso_recommendation_date=None, ead_start=None))
    assert f"{part}.file_by" not in items(out)
    assert said_anywhere(out, f"{part}.dso_recommendation_date") == []
    assert out["verdict"]["state"] == "cannot_tell"
    assert reasons_with(out, "missing:") == [f"missing:{part}.ead_start"]


@pytest.mark.parametrize("part", PARTS)
def test_a_recommendation_date_still_blocks_while_nothing_later_is_recorded(part):
    changed = with_block(
        CASE_B, part, dso_recommendation_date=None, i765_filed_date=None, ead_start=None
    )
    out = run(changed)
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"missing:{part}.dso_recommendation_date" in out["verdict"]["reasons"]
    assert items(out)[f"{part}.file_by"]["value"] is None
    assert contract_problems(out) == []


def test_the_other_block_keeps_its_own_file_by():
    # Each recommendation date is judged by the dates of its own block.
    out = run(with_block(CASE_B, "stem", dso_recommendation_date=None))
    assert "stem.file_by" not in items(out)
    # opt.dso_recommendation_date 2024-03-01 plus 30 days.
    assert values(out)["opt.file_by"] == "2024-03-31"


def test_without_the_recommendation_date_case_a_gets_the_verdict_it_had_with_it():
    whole = run(CASE_A)
    assert whole["verdict"] == {"state": "no_open_items", "reasons": []}
    out = run(with_block(CASE_A, "opt", dso_recommendation_date=None))
    assert out["verdict"] == whole["verdict"]
    expected = {k: v for k, v in values(whole).items() if k != "opt.file_by"}
    assert values(out) == expected


@pytest.mark.parametrize("part", PARTS)
def test_a_filing_date_never_blocks(part):
    whole = run(CASE_B)
    out = run(with_block(CASE_B, part, i765_filed_date=None))
    assert reasons_with(out, "missing:") == []
    assert out["verdict"] == whole["verdict"]
    assert values(out) == values(whole)


@pytest.mark.parametrize("part", PARTS)
@pytest.mark.parametrize("others", [{}, {"dso_recommendation_date": None}, {"ead_start": None}])
def test_a_filing_date_is_never_named_as_missing(part, others):
    out = run(with_block(CASE_B, part, i765_filed_date=None, **others))
    assert [r for r in out["verdict"]["reasons"] if "i765_filed_date" in r] == []


@pytest.mark.parametrize("part", PARTS)
@pytest.mark.parametrize("field", ["ead_start", "ead_end"])
@pytest.mark.parametrize(
    "others",
    [{}, {"dso_recommendation_date": None}, {"i765_filed_date": None}],
    ids=["alone", "no_recommendation_date", "no_filing_date"],
)
def test_the_ead_dates_of_a_block_that_is_present_always_matter(part, field, others):
    out = run(with_block(CASE_B, part, **{field: None}, **others))
    assert out["verdict"]["state"] == "cannot_tell"
    assert f"missing:{part}.{field}" in out["verdict"]["reasons"]
    assert contract_problems(out) == []


@st.composite
def whole_cases(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    """A case with OPT and STEM, every date entered, no conflict, and a day."""
    program_end = draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2026, 12, 31)))
    opt_start = program_end + timedelta(days=draw(st.integers(min_value=1, max_value=60)))
    opt_end = opt_start + timedelta(days=364)
    stem_start = opt_end + timedelta(days=1)
    today = opt_start + timedelta(days=draw(st.integers(min_value=0, max_value=1000)))
    case = {
        "program_end_date": program_end.isoformat(),
        "degree_level": draw(st.sampled_from(["bachelor", "master", "doctorate"])),
        "documents_count": draw(st.integers(min_value=1, max_value=20)),
        "cpt_full_time_days": draw(st.integers(min_value=0, max_value=300)),
        "opt": ead(
            (program_end - timedelta(days=45)).isoformat(),
            (program_end - timedelta(days=30)).isoformat(),
            opt_start.isoformat(),
            opt_end.isoformat(),
        ),
        "stem": ead(
            (opt_end - timedelta(days=60)).isoformat(),
            (opt_end - timedelta(days=30)).isoformat(),
            stem_start.isoformat(),
            (stem_start + timedelta(days=729)).isoformat(),
        ),
        "employment": [job(opt_start.isoformat(), None, hours=draw(st.sampled_from([10, 40])))],
        "cap_gap": None,
        "time_zone": "UTC",
    }
    return case, today


FILING_FIELDS = ("dso_recommendation_date", "i765_filed_date")


@settings(max_examples=200, deadline=None)
@given(
    whole_cases(),
    st.lists(
        st.tuples(st.sampled_from(PARTS), st.sampled_from(FILING_FIELDS)),
        min_size=1,
        max_size=4,
        unique=True,
    ),
)
def test_no_date_from_before_the_ead_blocks_a_case_that_holds_the_ead(drawn, emptied):
    # Section 3, the whole table: with both EAD dates recorded, neither the
    # recommendation date nor the filing date is a missing input.
    whole, today = drawn
    case = whole
    for part, field in emptied:
        case = with_block(case, part, **{field: None})
    out = run(case, today=today, checked_on=today)
    assert reasons_with(out, "missing:") == []
    left_out = {f"{part}.file_by" for part, field in emptied if field == FILING_FIELDS[0]}
    assert left_out.isdisjoint(items(out))
    before = run(whole, today=today, checked_on=today)
    expected = {k: v for k, v in values(before).items() if k not in left_out}
    assert values(out) == expected
    if left_out.isdisjoint(before["verdict"]["reasons"]):
        assert out["verdict"] == before["verdict"]
    assert contract_problems(out) == []


# Section 4: confirm, never assume


def test_a_case_with_no_gap_raises_no_question():
    for case in (CASE_A, CASE_B, SEPTEMBER):
        out = run(case)
        assert out["questions"] == []
        assert unconfirmed(out) == []


# held_post_completion_opt


@pytest.mark.parametrize("opt", ["absent", "null"])
def test_stem_without_opt_asks_whether_the_person_held_opt(opt):
    case = STEM_ONLY if opt == "absent" else with_changes(STEM_ONLY, opt=None)
    out = run(case)
    assert question_ids(out) == [HELD_OPT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [HELD_OPT]
    assert contract_problems(out) == []


def test_the_question_names_the_inputs_that_raised_it():
    (question,) = run(STEM_ONLY)["questions"]
    assert set(question) == {"id", "because"}
    assert question["because"]
    for name in question["because"]:
        assert name.split(".")[0] in CASE_FIELDS, name
    assert any(name.split(".")[0] == "stem" for name in question["because"])


def test_while_the_question_is_open_duly_does_not_say_that_opt_is_missing():
    # PRINCIPLES.md, 2: Duly does not guess that OPT existed, and does not guess that it
    # did not. The OPT dates become missing inputs when the person says yes.
    out = run(STEM_ONLY)
    assert names_opt(out) == []
    assert "stem_without_post_completion_opt" not in out["verdict"]["reasons"]
    assert no_count_is_a_number(out)


def test_while_the_question_is_open_the_engine_still_gives_the_items_it_can():
    got = values(run(STEM_ONLY))
    # program_end_date 2026-05-15 minus 90 days: back 15 to Apr 30, back 30 to Mar 31
    # (45), back 31 to Feb 28 (76), back 14 to Feb 14 (90).
    assert got["opt.apply_window_opens"] == "2026-02-14"
    # final_end is stem.ead_end 2028-05-31. Plus 60 days: 30 to Jun 30, 30 to Jul 30.
    assert got["grace.ends"] == "2028-07-30"
    # stem.ead_start 2026-06-01 plus 12 months is 2027-06-01, plus 10 days.
    assert got["stem.evaluation_12_month_due"] == "2027-06-11"


def test_the_answer_yes_makes_the_opt_ead_dates_missing_inputs():
    out = run(answered(STEM_ONLY, held_post_completion_opt=True))
    assert out["questions"] == []
    assert unconfirmed(out) == []
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:opt.ead_start" in out["verdict"]["reasons"]
    assert "missing:opt.ead_end" in out["verdict"]["reasons"]
    assert "stem_without_post_completion_opt" not in out["verdict"]["reasons"]
    assert no_count_is_a_number(out)
    assert contract_problems(out) == []


def test_the_answer_no_sends_the_person_to_the_dso():
    out = run(answered(STEM_ONLY, held_post_completion_opt=False))
    assert out["questions"] == []
    assert unconfirmed(out) == []
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "stem_without_post_completion_opt" in out["verdict"]["reasons"]
    assert reasons_with(out, "missing:") == []
    assert contract_problems(out) == []


def test_the_answer_no_shows_the_words_of_the_law_and_no_conclusion():
    raw = pack_dict(CHECKED_ON)
    out = run(answered(STEM_ONLY, held_post_completion_opt=False), raw_pack=raw)
    flag = "stem.requires_post_completion_opt"
    shown = out["rules"][flag]
    source = next(p for p in raw["parameters"] if p["id"] == flag)["source"]
    assert shown["quote"] == source["quote"]
    assert shown["citation"] == source["citation"]
    assert shown["value"] is True
    assert shown["status"] == "settled"
    # BOUNDARY.md, B2: the engine reports. The judgement is named in the verdict, for the
    # DSO, and no item carries it as a value.
    for item in out["computed"]:
        assert "stem_without_post_completion_opt" not in str(item)
        assert not isinstance(item["value"], bool), item["id"]
    # The window cannot be known, so nothing is said about the days in it.
    assert no_count_is_a_number(out)


def test_the_paragraph_is_not_shown_where_the_question_does_not_arise():
    # Case B holds OPT. The rule is named by no item, and the judgement was not made.
    assert "stem.requires_post_completion_opt" not in run(CASE_B)["rules"]


def test_the_answer_no_does_not_hide_what_stops_duly_from_knowing():
    # CLAUDE.md: a verdict never falls back. No documents is cannot_tell, whatever else.
    case = with_changes(answered(STEM_ONLY, held_post_completion_opt=False), documents_count=0)
    out = run(case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert "no_documents" in out["verdict"]["reasons"]


@pytest.mark.parametrize("answer", [True, False])
def test_the_day_of_the_answer_changes_nothing(answer):
    early = run(answered(STEM_ONLY, on="2026-06-02", held_post_completion_opt=answer))
    late = run(answered(STEM_ONLY, on="2026-09-28", held_post_completion_opt=answer))
    assert early == late


def test_an_answer_to_another_question_leaves_this_one_open():
    out = run(answered(STEM_ONLY, no_employment_to_record=True, cap_gap_without_training=True))
    assert question_ids(out) == [HELD_OPT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [HELD_OPT]


def test_stem_with_opt_does_not_raise_the_question():
    out = run(CASE_B)
    assert HELD_OPT not in question_ids(out)


# no_employment_to_record


def test_an_empty_employment_list_after_the_window_has_begun_raises_the_question():
    out = run(NO_JOBS)
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [NO_EMPLOYMENT]
    (question,) = out["questions"]
    assert any(name.split(".")[0] == "employment" for name in question["because"])
    assert contract_problems(out) == []


def test_while_the_question_is_open_no_day_is_counted():
    # Counting goes ahead on an empty list when the person says the list is whole.
    out = run(NO_JOBS)
    assert no_count_is_a_number(out)
    assert "missing:employment" not in out["verdict"]["reasons"]


@pytest.mark.parametrize(
    ("today", "asked"),
    [
        (date(2026, 5, 31), False),  # the day before opt.ead_start
        (date(2026, 6, 1), True),  # the day of
        (date(2026, 6, 2), True),  # the day after
    ],
)
def test_the_question_is_raised_from_the_first_day_of_the_window(today, asked):
    out = run(NO_JOBS, today=today, checked_on=today)
    assert (NO_EMPLOYMENT in question_ids(out)) is asked
    assert (NO_EMPLOYMENT in unconfirmed(out)) is asked


def test_the_window_begins_on_the_persons_own_day():
    # 01:30 UTC on 2026-06-01 is May 31 in Los Angeles and June 1 in Kolkata.
    instant = clock_at("2026-06-01T01:30")
    west = run(in_zone(NO_JOBS, "America/Los_Angeles"), clock=instant, checked_on="2026-05-31")
    east = run(in_zone(NO_JOBS, "Asia/Kolkata"), clock=instant, checked_on="2026-05-31")
    assert NO_EMPLOYMENT not in question_ids(west)
    assert NO_EMPLOYMENT in question_ids(east)


def test_the_answer_yes_counts_on_an_empty_list():
    # OPT from 2026-06-01. Through 2026-08-01: 30 in June, 31 in July, 1 in August.
    today = date(2026, 8, 1)
    out = run(answered(NO_JOBS, no_employment_to_record=True), today=today, checked_on=today)
    assert out["questions"] == []
    assert unconfirmed(out) == []
    got = values(out)
    assert got["unemployment.days_used"] == 62
    assert got["unemployment.days_remaining"] == 28  # 90 - 62
    assert got["employment.days_under_hours"] == 0
    assert got["employment.periods_not_reported"] == 0
    assert reasons_with(out, "missing:") == []
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}
    assert contract_problems(out) == []


def test_the_answer_yes_counts_every_day_and_reaches_the_limit():
    # Through 2026-09-28: 30 + 31 + 31 + 28 = 120 days, 30 over the limit of 90.
    out = run(answered(NO_JOBS, no_employment_to_record=True))
    assert values(out)["unemployment.days_used"] == 120
    assert values(out)["unemployment.days_remaining"] == -30
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "unemployment_at_or_over_limit" in out["verdict"]["reasons"]


def test_the_answer_no_names_employment_as_missing():
    out = run(answered(NO_JOBS, no_employment_to_record=False))
    assert out["questions"] == []
    assert unconfirmed(out) == []
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:employment" in out["verdict"]["reasons"]
    assert no_count_is_a_number(out)
    assert contract_problems(out) == []


def test_employment_that_is_entered_raises_no_question():
    out = run(CASE_A)
    assert out["questions"] == []
    assert "missing:employment" not in out["verdict"]["reasons"]


def test_an_empty_list_with_neither_opt_nor_stem_raises_no_question():
    # specs/product-1/SPEC.md, section 2: with no part entered the engine now asks
    # nothing_more_to_record. This test protects that it does not ask about employment.
    out = run(with_changes(NO_JOBS, opt=None))
    assert NO_EMPLOYMENT not in question_ids(out)
    assert reasons_with(out, "missing:") == []


def test_an_empty_list_during_the_stem_extension_raises_the_question():
    out = run(with_changes(CASE_B, employment=[]))
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [NO_EMPLOYMENT]


# cap_gap_without_training


@pytest.mark.parametrize("opt", ["absent", "null"])
@pytest.mark.parametrize("stem", ["absent", "null"])
def test_cap_gap_with_neither_opt_nor_stem_asks(opt, stem):
    case = dict(CAP_GAP_ONLY)
    if opt == "null":
        case["opt"] = None
    if stem == "null":
        case["stem"] = None
    out = run(case)
    assert question_ids(out) == [CAP_GAP_ALONE]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [CAP_GAP_ALONE]
    assert names_opt(out) == []
    (question,) = out["questions"]
    assert any(name.split(".")[0] == "cap_gap" for name in question["because"])
    assert contract_problems(out) == []


def test_cap_gap_alone_with_the_answer_yes_names_the_opt_ead_end():
    out = run(answered(CAP_GAP_ONLY, cap_gap_without_training=True))
    assert out["questions"] == []
    assert unconfirmed(out) == []
    assert out["verdict"]["state"] == "cannot_tell"
    assert "missing:opt.ead_end" in out["verdict"]["reasons"]
    assert "cap_gap_without_training" not in out["verdict"]["reasons"]
    assert contract_problems(out) == []


def test_cap_gap_alone_with_the_answer_no_sends_the_person_to_the_dso():
    out = run(answered(CAP_GAP_ONLY, cap_gap_without_training=False))
    assert out["questions"] == []
    assert unconfirmed(out) == []
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "cap_gap_without_training" in out["verdict"]["reasons"]
    assert reasons_with(out, "missing:") == []
    assert contract_problems(out) == []


def test_cap_gap_with_opt_does_not_raise_the_question():
    out = run(with_changes(CASE_A, cap_gap=cap_gap("2026-10-01")))
    assert out["questions"] == []
    assert reasons_with(out, "missing:") == []


def test_cap_gap_with_stem_alone_asks_about_opt_and_not_about_training():
    out = run(with_changes(STEM_ONLY, cap_gap=cap_gap("2026-10-01")))
    assert question_ids(out) == [HELD_OPT]


# Every question


@pytest.mark.parametrize("case", [CASE_A, CASE_B, SEPTEMBER], ids=["a", "b", "september"])
@pytest.mark.parametrize("answer", [True, False])
def test_an_answer_to_a_question_that_is_not_raised_changes_nothing(case, answer):
    given = dict.fromkeys(QUESTION_IDS, answer)
    assert run(with_changes(case, confirmations=answers(**given))) == run(case)


def test_a_case_with_every_answer_is_a_case_of_the_contract():
    assert case_problems(with_changes(CASE_B, confirmations=answered_yes())) == []


def test_the_output_never_carries_an_answer_the_person_did_not_give():
    # The engine never fills one in: the answers are in the case and nowhere else.
    for case in (STEM_ONLY, NO_JOBS, CAP_GAP_ONLY):
        out = run(case)
        assert "confirmations" not in out
        assert contract_problems(out) == []


PART_NAMES = ("opt", "stem", "cap_gap", "employment")


@st.composite
def cases_with_gaps(draw: st.DrawFn) -> tuple[dict[str, Any], date]:
    """A whole case with some of its parts taken away and some questions answered."""
    case, today = draw(whole_cases())
    case["cap_gap"] = cap_gap(
        (today + timedelta(days=draw(st.integers(min_value=30, max_value=400)))).isoformat(),
        status=draw(st.sampled_from(["pending", "approved"])),
    )
    for part in draw(st.lists(st.sampled_from(PART_NAMES), unique=True, max_size=4)):
        if part == "employment":
            case["employment"] = []
        elif draw(st.booleans()):
            case[part] = None
        else:
            del case[part]
    given = draw(st.dictionaries(st.sampled_from(QUESTION_IDS), st.booleans(), max_size=3))
    if given or draw(st.booleans()):
        case["confirmations"] = answers(today.isoformat(), **given)
    return case, today


@settings(max_examples=500, deadline=None)
@given(cases_with_gaps())
def test_an_open_question_is_cannot_tell_and_a_gap_never_gets_the_quiet_verdict(drawn):
    # SPEC-context, section 4, "A general property for the tests".
    case, today = drawn
    out = run(case, today=today, checked_on=today)
    assert contract_problems(out) == []
    # specs/product-1/SPEC.md, sections 1 and 2: the engine now asks two more questions,
    # and one for each conflict, whose reason is conflict:<id>. Those have their own
    # property in the product tests. This one keeps to the questions of its round.
    asked = [asked_id for asked_id in question_ids(out) if asked_id not in CONFLICT_IDS]
    given = case.get("confirmations", {})
    assert len(asked) == len(set(asked))
    assert set(asked) <= {*QUESTION_IDS, NOTHING_MORE, CPT_USED}
    assert sorted(unconfirmed(out)) == sorted(asked)
    # A question the person has answered is not asked again.
    assert set(asked).isdisjoint(given)
    if asked:
        assert out["verdict"]["state"] == "cannot_tell"

    opt, stem = case.get("opt"), case.get("stem")
    if stem and not opt:
        # Asked, or answered. Yes names the OPT dates; no is for the DSO.
        assert HELD_OPT in asked or HELD_OPT in given
        assert out["verdict"]["state"] in ("cannot_tell", "talk_to_dso")
    if case.get("cap_gap") and not opt and not stem:
        assert CAP_GAP_ALONE in asked or CAP_GAP_ALONE in given
        assert out["verdict"]["state"] in ("cannot_tell", "talk_to_dso")
    if opt and not case["employment"] and today >= date.fromisoformat(opt["ead_start"]):
        assert NO_EMPLOYMENT in asked or NO_EMPLOYMENT in given
        if out["verdict"]["state"] != "cannot_tell":
            assert given[NO_EMPLOYMENT]["answer"] is True

    if out["verdict"]["state"] == "no_open_items":
        assert not stem or opt
        assert not case.get("cap_gap") or opt or stem
        assert asked == []
        assert reasons_with(out, "missing:") == []


# Section 5: rules shown with their derivation


def rows(raw_pack: dict[str, Any], rule_id: str) -> list[dict[str, Any]]:
    return [p for p in raw_pack["parameters"] if p["id"] == rule_id]


@pytest.mark.parametrize("case", [CASE_A, CASE_B], ids=["a", "b"])
def test_every_rule_shown_carries_the_derivation_the_pack_gives_it(case):
    raw = pack_dict(CHECKED_ON)
    out = run(case, raw_pack=raw)
    assert out["rules"]
    for rule_id, shown in out["rules"].items():
        expected = "reading" if rule_id in READINGS else "verbatim"
        assert {p["derivation"] for p in rows(raw, rule_id)} == {expected}
        assert shown["derivation"] == expected, rule_id
    assert contract_problems(out) == []


def test_a_reading_carries_its_note_beside_the_quoted_words():
    raw = pack_dict(CHECKED_ON)
    out = run(CASE_B, raw_pack=raw)
    # cpt.full_time_days_used names both rules, and both are readings in the test pack.
    for rule_id in ("cpt.full_time_months_bar", "cpt.full_time_bar_days"):
        shown = out["rules"][rule_id]
        (row,) = rows(raw, rule_id)
        assert shown["derivation"] == "reading"
        assert shown["note"] == READINGS[rule_id] == row["note"]
        assert shown["quote"] == row["source"]["quote"]
        assert shown["note"] != shown["quote"]


def test_a_verbatim_rule_without_a_note_is_shown_without_one():
    out = run(CASE_B)
    for rule_id, shown in out["rules"].items():
        if rule_id not in READINGS:
            assert "note" not in shown, rule_id


def test_the_derivation_comes_from_the_pack_and_from_nowhere_else():
    note = "placeholder note written by this test alone"
    raw = with_derivation(pack_dict(CHECKED_ON), "opt.apply_before_days", "reading", note)
    raw = with_derivation(raw, "cpt.full_time_months_bar", "verbatim")
    out = run(CASE_B, raw_pack=raw)
    assert out["rules"]["opt.apply_before_days"]["derivation"] == "reading"
    assert out["rules"]["opt.apply_before_days"]["note"] == note
    assert out["rules"]["cpt.full_time_months_bar"]["derivation"] == "verbatim"
    assert "note" not in out["rules"]["cpt.full_time_months_bar"]
    # The derivation is about the words. It changes no date and no count.
    assert values(out) == values(run(CASE_B))
    assert contract_problems(out) == []


def test_a_rule_held_under_a_regime_carries_its_derivation():
    note = "placeholder note on the grace period written by this test alone"
    raw = with_derivation(pack_dict(CHECKED_ON), "grace.after_completion_days", "reading", note)
    out = run(CASE_A, raw_pack=raw)
    shown = out["rules"]["grace.after_completion_days"]
    assert shown["derivation"] == "reading"
    assert shown["note"] == note
    assert shown["value"] == rule_value(raw, "grace.after_completion_days", shown["regime"])


def test_the_paragraph_on_who_may_apply_carries_its_derivation():
    out = run(answered(STEM_ONLY, held_post_completion_opt=False))
    assert out["rules"]["stem.requires_post_completion_opt"]["derivation"] == "verbatim"
