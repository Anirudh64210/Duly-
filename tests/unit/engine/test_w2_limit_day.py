"""N2: the limit day of a counter. specs/step-w/SPEC-W2.md point 46: "the day the count would
reach its limit if nothing in the record changes, an item <counter>.<key>.limit_day, with
words that never say what follows that day"; gap map G15 ("the limit date is Dec 19").

Under the condition "nothing in the record changes", a days count grows by one each day while
nothing covers the day, and stops at the counter's span end. So with the count `used` through
today and the limit L: limit_day = today + (L - used) days, when that day is inside the span.
The count is never reached when no day is being counted (a job runs on) or the span ends
first; then the item gives no date. A count that is not known gives no date either.

The limits are read from the saved words first (tests/support/w2_pack.py). Each date is
worked by hand beside its assertion; the clock is injected. Written before the engine has the
item: these cannot pass yet.
"""

from datetime import date, timedelta
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from tests.support.w2_pack import (
    compute,
    f1_pack,
    items,
    number_in_saved_words,
    rec,
    toy_case,
    toy_pack,
    toy_stage,
)

TODAY = date(2026, 9, 29)  # a Tuesday
PACK = f1_pack()
SUFFIX = ".limit_day"

OPT_LIMIT = number_in_saved_words(
    PACK, "opt.unemployment_limit_days", r"more than (\d+) days of unemployment", TODAY
)
STEM_LIMIT = number_in_saved_words(
    PACK, "stem.unemployment_limit_days", r"more than (\d+) days of unemployment", TODAY
)

# BOUNDARY.md: Duly states the day, never what follows it. None of these may appear in the
# item's own words.
WHAT_FOLLOWS = (
    "status",
    "terminat",
    "unlawful",
    "violat",
    "deport",
    "removal",
    "depart",
    "leave",
    "lose",
    "lost",
    "out of",
    "fail",
    "must",
    "should",
    "too late",
)


def test_the_limits_are_the_saved_words():
    # (f)(10)(ii)(E): "more than 90 days of unemployment"; with a 24-month extension, "more
    # than 150 days".
    assert (OPT_LIMIT, STEM_LIMIT) == (90, 150)


def limit_day(out: dict[str, Any], counter: str, key: str) -> dict[str, Any] | None:
    return items(out).get(f"{counter}.{key}{SUFFIX}")


def limit_day_value(out: dict[str, Any], counter: str, key: str) -> Any:
    found = limit_day(out, counter, key)
    return None if found is None else found["value"]


# The cases on the shipped F-1 pack.

LISTS_WHOLE = ("program", "authorization", "work", "trip", "move", "petition", "withdrawal")


def f1_case(records: list[dict[str, Any]], *, trips_whole: bool = True) -> dict[str, Any]:
    stated = {"on": TODAY.isoformat()}
    complete = {key: stated for key in LISTS_WHOLE if trips_whole or key != "trip"}
    return {
        "categories": ["f1"],
        "time_zone": "UTC",
        "facts": {},
        "records": records,
        "complete": complete,
        "confirmations": {},
    }


PROGRAM = rec(
    "p1",
    "program",
    where="us_on_f1",
    level="master",
    stem_list="on_list",
    end_date="2026-05-15",
    state="completed",
)
EMPLOYER = rec("e1", "employer", name="Employer One", e_verify="yes")


def opt_card(end: str = "2027-05-31") -> dict[str, Any]:
    return rec(
        "a1",
        "authorization",
        type="opt_post_completion",
        program="p1",
        decision="approved",
        dso_on="2026-04-01",
        filed_on="2026-04-10",
        card_start="2026-06-01",
        card_end=end,
    )


def opt_case(job_end: str | None, card_end: str = "2027-05-31", **kw: Any) -> dict[str, Any]:
    fields: dict[str, Any] = {"employer": "e1", "under": "a1", "start": "2026-07-01"}
    if job_end is not None:
        fields["end"] = job_end
    job = rec("w1", "work", hours_per_week=40, **fields)
    return f1_case([PROGRAM, opt_card(card_end), EMPLOYER, job], **kw)


def test_opt_card_limit_day_when_no_job_runs():
    # Card from 2026-06-01; the job ran 2026-07-01 to 2026-08-31. Without work: June 1-30
    # (30) and Sep 1-29 (29), 59 through today. 90 - 59 = 31 more days: Sep 30 (1), Oct 30
    # (31). The count reaches 90 on 2026-10-30.
    out = compute(opt_case("2026-08-31"), [PACK], TODAY)
    assert items(out)["unemployment.opt_card.a1"]["value"] == 59
    assert TODAY + timedelta(days=OPT_LIMIT - 59) == date(2026, 10, 30)
    assert limit_day_value(out, "unemployment.opt_card", "a1") == "2026-10-30"


def test_one_day_more_without_work_brings_the_limit_day_one_day_closer():
    # The job ends 2026-08-30: 60 days through today, 30 more: 2026-10-29.
    out = compute(opt_case("2026-08-30"), [PACK], TODAY)
    assert limit_day_value(out, "unemployment.opt_card", "a1") == "2026-10-29"


def test_at_the_limit_the_limit_day_is_today():
    # The job ends 2026-07-31: June (30) and Aug 1 to Sep 29 (31 + 29 = 60), 90 through
    # today. The count reached 90 today.
    out = compute(opt_case("2026-07-31"), [PACK], TODAY)
    assert items(out)["unemployment.opt_card.a1"]["value"] == OPT_LIMIT
    assert limit_day_value(out, "unemployment.opt_card", "a1") == TODAY.isoformat()


def test_the_limit_day_is_a_dated_item_resting_on_the_limit_rule():
    out = compute(opt_case("2026-08-31"), [PACK], TODAY)
    item = limit_day(out, "unemployment.opt_card", "a1")
    assert item is not None
    assert item["unit"] == "date"
    assert "opt.unemployment_limit_days" in item["rule_ids"]
    assert "opt.unemployment_limit_days" in out["rules"]
    # It rests on rules and the record, never on a product setting.
    assert "planning" not in item


def test_the_limit_day_s_words_never_say_what_follows_that_day():
    out = compute(opt_case("2026-08-31"), [PACK], TODAY)
    item = limit_day(out, "unemployment.opt_card", "a1")
    assert item is not None
    words = " ".join(str(v).lower() for k, v in item.items() if isinstance(v, str) and k != "value")
    assert [w for w in WHAT_FOLLOWS if w in words] == []
    assert item["id"] == "unemployment.opt_card.a1" + SUFFIX


def test_while_a_job_runs_on_the_limit_is_never_reached():
    # The job from 2026-07-01 runs on. If nothing changes, no further day is counted: the
    # count stays at 30 (June) and no limit day is given.
    out = compute(opt_case(None), [PACK], TODAY)
    assert items(out)["unemployment.opt_card.a1"]["value"] == 30
    assert limit_day_value(out, "unemployment.opt_card", "a1") is None


def test_a_limit_day_after_the_card_ends_is_not_given():
    # Card to 2026-10-15; 59 days through today as above. The count would reach 90 on
    # 2026-10-30, after the card's last day; it stops at 59 + 16 = 75 (Sep 30 to Oct 15).
    out = compute(opt_case("2026-08-31", card_end="2026-10-15"), [PACK], TODAY)
    assert limit_day_value(out, "unemployment.opt_card", "a1") is None


def test_no_limit_day_is_given_for_a_count_that_is_not_known():
    # The trip list is not stated whole, so the count is null (resolutions point 13) and so is
    # any day worked from it.
    out = compute(opt_case("2026-08-31", trips_whole=False), [PACK], TODAY)
    assert items(out)["unemployment.opt_card.a1"]["value"] is None
    assert limit_day_value(out, "unemployment.opt_card", "a1") is None
    assert out["verdict"]["state"] == "cannot_tell"


@settings(deadline=None, max_examples=30)
@given(st.integers(min_value=1, max_value=59))
def test_the_limit_day_moves_with_the_days_counted(idle_since_job):
    # The job ends `idle_since_job` days before today (2026-07-31 at most 59 days back is
    # 2026-08-01 at the earliest). Counted: 30 (June) + idle_since_job, under 90.
    job_end = TODAY - timedelta(days=idle_since_job)
    out = compute(opt_case(job_end.isoformat()), [PACK], TODAY)
    used = 30 + idle_since_job
    assert items(out)["unemployment.opt_card.a1"]["value"] == used
    expected = TODAY + timedelta(days=OPT_LIMIT - used)
    assert limit_day_value(out, "unemployment.opt_card", "a1") == expected.isoformat()


# STEM: the total count over the OPT card and its extension, with its own limit.


def stem_case() -> dict[str, Any]:
    # OPT card a1 2025-07-01 to 2026-06-30 (program end 2025-05-15), STEM card a2 2026-07-01
    # to 2028-06-30, filed 2026-04-10 inside its window (opens 2026-04-01). w1 covers the
    # whole OPT card; w2 runs 2026-07-01 to 2026-08-31.
    program = dict(PROGRAM, fields=dict(PROGRAM["fields"], end_date="2025-05-15"))
    a1 = rec(
        "a1",
        "authorization",
        type="opt_post_completion",
        program="p1",
        decision="approved",
        dso_on="2025-04-01",
        filed_on="2025-04-10",
        card_start="2025-07-01",
        card_end="2026-06-30",
    )
    a2 = rec(
        "a2",
        "authorization",
        type="stem_extension",
        program="p1",
        extends="a1",
        basis_program="p1",
        employer="e1",
        decision="approved",
        dso_on="2026-04-05",
        filed_on="2026-04-10",
        card_start="2026-07-01",
        card_end="2028-06-30",
    )
    w1 = rec("w1", "work", employer="e1", under="a1", start="2025-07-01", end="2026-06-30")
    w2 = rec("w2", "work", employer="e1", under="a2", start="2026-07-01", end="2026-08-31")
    for job in (w1, w2):
        job["fields"]["hours_per_week"] = 40
    return f1_case([program, a1, a2, EMPLOYER, w1, w2])


def test_stem_total_limit_day():
    # Without work: Sep 1-29, 29 days, all on a2. 150 - 29 = 121 more: Sep 30 (1), Oct 31
    # (32), Nov 30 (62), Dec 31 (93), Jan 28 (121). The total reaches 150 on 2027-01-28.
    out = compute(stem_case(), [PACK], TODAY)
    totals = {
        i["id"]: i["value"]
        for i in out["computed"]
        if i["id"].startswith("unemployment.total.") and i["id"].endswith(SUFFIX)
    }
    assert TODAY + timedelta(days=STEM_LIMIT - 29) == date(2027, 1, 28)
    assert list(totals.values()) == ["2027-01-28"], totals


def test_a_counter_whose_span_has_ended_gives_no_limit_day():
    # a1's own count stopped on its last day, 2026-06-30, with 0 days: nothing more can be
    # counted, so no limit day.
    out = compute(stem_case(), [PACK], TODAY)
    assert limit_day_value(out, "unemployment.opt_card", "a1") is None


def test_a_count_of_records_has_no_limit_day_from_time_alone():
    # stem.extensions counts records; with nothing in the record changing it never grows.
    out = compute(stem_case(), [PACK], TODAY)
    assert limit_day_value(out, "stem.extensions", "all") is None


# N2 on the toy pack: no F-1 knowledge, the limit read from the pack.

TOY_COUNTER = {
    "id": "toy.idle",
    "calculator": "days_without_qualifying_period",
    "scope": {"of": {"record": "card"}, "group": "record"},
    "span": {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}},
    "qualifying": {"record": "job", "where": [{"field": "this.under", "same_as": "outer.id"}]},
    "hours_rule": "toy.hours",
    "limit_rule": "toy.bar",
    "rule_ids": ["toy.definition"],
}


def test_n2_a_toy_counter_gets_its_limit_day_from_its_own_limit_rule():
    # toy.bar is 30 days. k1 from 2026-09-20, no job: Sep 20-29 is 10 days. 30 - 10 = 20
    # more: Sep 30 (1), Oct 19 (20). The count reaches 30 on 2026-10-19.
    pack = toy_pack([toy_stage()], counters=[TOY_COUNTER])
    course = rec("c1", "course", start="2025-01-06", end="2027-06-30")
    card = rec("k1", "card", card_start="2026-09-20", card_end="2027-09-19")
    out = compute(toy_case([course, card], TODAY), [pack], TODAY)
    assert items(out)["toy.idle.k1"]["value"] == 10
    assert limit_day_value(out, "toy.idle", "k1") == "2026-10-19"
    assert "toy.bar" in items(out)["toy.idle.k1" + SUFFIX]["rule_ids"]
