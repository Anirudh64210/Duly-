"""engine/f1.py: the fifth fix. specs/product-1/SPEC-resolutions.md, points 55 and 56.

Point 55: an item carries an alternate only where the alternate holds a value (points 25
and 49). Point 56: every rule is looked up for the day of the event it governs, including
opt.report_employer_within_days for a period's end (point 40); a rule with no row in force
on that day gives null with the step back, never an error: no clock and no case makes the
engine fail. reviews/product-1-fix4.md, notes 5 and 6, give the cases.

Written before the engine has them, from the SPEC and the contracts, never from the
engine. The clock is injected at noon UTC on the day of each case. Every answer is given on
the day of the case with the about the output asked it with (points 2 and 7).

Every expected date and count was worked out by hand. The working is beside it.
"""

import copy
from collections.abc import Callable, Iterator
from datetime import date, timedelta
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import Rulepack, load_all, validate_pack
from tests.support.f1_pack import (
    CONFLICT_IDS,
    CPT_USED,
    NOT_AFTER_PROGRAM_END,
    WINDOW_CONFLICT_IDS,
    case_problems,
    clock_on,
    contract_problems,
    ead,
    items,
    job,
    months_later,
    pack_dict,
    question_ids,
    refuse_placeholders,
    values,
    with_changes,
)

TODAY = date(2026, 9, 29)
ONE_DAY = timedelta(days=1)
PACK = pack_dict(TODAY)

# The two clocks of reviews/product-1-fix4.md, note 6. Both are before 2025-05-19, the day
# the shipped row of opt.report_employer_within_days takes effect.
CLOCK_2016 = date(2016, 10, 1)
CLOCK_2024 = date(2024, 9, 1)
REPORT_ROW_FROM = "2025-05-19"

EARLIER = "opt.earlier_at_this_level"
OPEN_AFTER = "employment.period_open_after_last_card"
NOT_IN_FORCE = "rule_not_in_force_on_event_day"
LITIGATION = "rule_in_litigation"
OPT_REPORT_RULE = "opt.report_employer_within_days"
CONFLICTS = {*CONFLICT_IDS, *WINDOW_CONFLICT_IDS, NOT_AFTER_PROGRAM_END, OPEN_AFTER}


def run(
    case: dict[str, Any],
    today: date = TODAY,
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> dict[str, Any]:
    """Compute a case with the clock injected at noon UTC on today. The test pack is
    checked on today, so the age of the rules never decides a verdict."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    if pack is None:
        pack = validate_pack(pack_dict(today) if raw_pack is None else raw_pack)
    return f1.compute_f1(f1.parse_case(refuse_placeholders(case), clock), pack, clock)


def default_answer(question_id: str) -> bool:
    """The answer a test about something else gives, as in test_f1_fix4.py: a new
    employer, earlier OPT at the level and full-time CPT are not assumed; every other
    question of the person is answered yes. A conflict is never answered by default."""
    assert question_id not in CONFLICTS, f"{question_id} is asked; the test must answer it"
    return not (question_id.endswith(".new_employer") or question_id in (EARLIER, CPT_USED))


def settle_with(
    case: dict[str, Any],
    today: date,
    answer: Callable[[str], bool],
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Answer every question the output asks, in the order it asks them (an answer can
    raise another), on today with the about as asked, as the screen does. Returns the case
    and its last output."""
    out = run(case, today, raw_pack, pack)
    for _ in range(12):
        asked = out["questions"]
        if not asked:
            break
        confirmations = copy.deepcopy(case.get("confirmations") or {})
        for q in asked:
            confirmations[q["id"]] = {"answer": answer(q["id"]), "on": today.isoformat()}
            if "about" in q:
                confirmations[q["id"]]["about"] = copy.deepcopy(q["about"])
        case = with_changes(case, confirmations=confirmations)
        out = run(case, today, raw_pack, pack)
    return case, out


def settle(
    case: dict[str, Any],
    today: date = TODAY,
    chosen: dict[str, bool] | None = None,
    raw_pack: dict[str, Any] | None = None,
    pack: Rulepack | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """settle_with, where chosen gives the answer to a question by id and default_answer
    the rest."""
    picked = chosen or {}
    return settle_with(
        case, today, lambda q: picked[q] if q in picked else default_answer(q), raw_pack, pack
    )


def iso(day: date) -> str:
    return day.isoformat()


def shipped() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


def entries(out: dict[str, Any]) -> Iterator[dict[str, Any]]:
    """Every item of the output: computed and upcoming."""
    yield from out["computed"]
    yield from out["upcoming"]


def null_alternates(out: dict[str, Any]) -> list[str]:
    """The ids of the items that carry an alternate whose value is null (point 55)."""
    return [
        entry["id"]
        for entry in entries(out)
        for alternate in entry.get("alternates", [])
        if alternate["value"] is None
    ]


def regimes_named(out: dict[str, Any]) -> set[str]:
    named: set[str] = set()
    for entry in entries(out):
        if "operative" in entry:
            named.add(entry["operative"]["regime"])
        named.update(alternate["regime"] for alternate in entry.get("alternates", []))
    return named


def report_by(out: dict[str, Any], number: int) -> dict[str, Any]:
    """The report of the end of employment period number (1-based), from computed."""
    return items(out)[f"employment.{number}.end_report_by"]


def end_reported(number: int) -> str:
    return f"employment.{number}.end_reported"


# The case of point 27, as in test_f1_fix4.py (REVIEW_42): program end 2027-01-15.
# Recommended 2026-03-01, filed 2026-03-10 (9 days on, within 30), card 2026-05-01 to
# 2026-08-31, wholly before the program end, so opt.ead_end.not_after_program_end is raised.
# No employment entered. Left unanswered, the items that use the card are null (point 27),
# grace.ends among them.
CASE_27: dict[str, Any] = {
    "program_end_date": "2027-01-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2026-03-01", "2026-03-10", "2026-05-01", "2026-08-31"),
    "stem": None,
    "employment": [],
    "cap_gap": None,
    "time_zone": "UTC",
}
# The card running today, a week before the program end, as in test_f1_fix4.py (RUNNING_42):
# program end 2026-12-15, recommended 2026-09-01, filed 2026-09-05 (4 days on), card
# 2026-09-10 to 2026-12-08, one period open from the card start.
RUNNING_27: dict[str, Any] = with_changes(
    CASE_27,
    program_end_date="2026-12-15",
    opt=ead("2026-09-01", "2026-09-05", "2026-09-10", "2026-12-08"),
    employment=[job("2026-09-10", None)],
)
# An OPT card running today, as OPT_CASE of test_f1_fix4.py: program end 2026-05-15, card
# 2026-06-01 to 2027-05-31, one period open from the card start. grace.ends is 60 days after
# 2027-05-31 (30 reach Jun 30, 30 more): 2027-07-30. The blocked row's 30 give 2027-06-30.
OPT_CASE: dict[str, Any] = with_changes(
    CASE_27,
    program_end_date="2026-05-15",
    opt=ead("2026-04-01", "2026-04-10", "2026-06-01", "2027-05-31"),
    employment=[job("2026-06-01", None)],
)


def test_the_cases_of_this_file_match_the_case_contract():
    for case in (CASE_27, RUNNING_27, OPT_CASE, CASE_2016, CASE_2024, ENDS_ON_THE_ROW_DAY):
        assert case_problems(case) == []
    # The review's case of point 27: the card ends before the program end.
    assert date(2026, 8, 31) <= date(2027, 1, 15)
    assert date(2026, 12, 8) <= date(2026, 12, 15)


# Point 55: an item carries an alternate only where the alternate holds a value.


def test_point_55_the_case_of_point_27_unanswered_carries_no_null_alternate():
    out = run(CASE_27)
    assert NOT_AFTER_PROGRAM_END in question_ids(out)
    assert null_alternates(out) == []
    assert contract_problems(out) == []


def test_point_55_grace_ends_null_in_the_case_of_point_27_names_no_alternate():
    # Note 5 of the review: grace.ends was null and carried [{"value": null}].
    out = run(CASE_27)
    grace = items(out)["grace.ends"]
    assert grace["value"] is None
    assert grace.get("alternates", []) == []
    assert LITIGATION not in out["verdict"]["reasons"]


def test_point_55_the_running_card_of_point_27_unanswered_carries_no_null_alternate():
    out = run(RUNNING_27)
    assert NOT_AFTER_PROGRAM_END in question_ids(out)
    assert out["verdict"]["state"] == "cannot_tell"
    assert null_alternates(out) == []
    assert contract_problems(out) == []


def test_point_55_on_the_shipped_pack_the_case_of_point_27_carries_no_null_alternate():
    # Note 5 names opt.apply_window_closes, opt.latest_start and grace.ends: each null and
    # each with a null alternate. The shipped rows of the paused regime take effect
    # 2026-09-15, before today.
    for case in (CASE_27, RUNNING_27):
        out = run(case, pack=shipped())
        for item_id in ("opt.apply_window_closes", "opt.latest_start", "grace.ends"):
            assert values(out)[item_id] is None, item_id
        assert null_alternates(out) == []
        assert contract_problems(out) == []


def test_point_55_regimes_names_only_what_the_items_name_in_the_case_of_point_27():
    # contracts/engine_output.schema.json: regimes holds every regime named by an item's
    # operative or alternates. With the null alternates gone, nothing else stays.
    for pack in (None, shipped()):
        out = run(CASE_27, pack=pack)
        assert set(out.get("regimes", {})) == regimes_named(out)


def test_point_55_an_alternate_with_a_value_is_kept():
    # The control: grace.ends is 2027-07-30, ahead, with the blocked row's 2027-06-30 as its
    # alternate. Point 55 keeps it.
    _, out = settle(OPT_CASE)
    grace = [entry for entry in entries(out) if entry["id"] == "grace.ends"]
    assert grace
    for entry in grace:
        assert [a["value"] for a in entry.get("alternates", [])] == ["2027-06-30"]
    assert null_alternates(out) == []


# Point 56: a rule with no row in force on its event's day gives null with the step back,
# never an error. The shipped row of opt.report_employer_within_days takes effect
# 2025-05-19. Note 6 of the review: with the clock at 2016-10-01 or 2024-09-01, any OPT case
# with a period raised RulepackError.
#
# CASE_2016: program end 2015-05-15, recommended 2015-04-01, filed 2015-04-10 (9 days on),
# card 2015-06-01 to 2016-05-31 (12 months from 2015-06-01 is 2016-06-01), one period over
# the card, closed on its last day. Had the row been in force, the end's report would be
# 2016-05-31 plus 10 days: 2016-06-10.
CASE_2016: dict[str, Any] = with_changes(
    CASE_27,
    program_end_date="2015-05-15",
    opt=ead("2015-04-01", "2015-04-10", "2015-06-01", "2016-05-31"),
    employment=[job("2015-06-01", "2016-05-31")],
)
# CASE_2024: program end 2023-05-15, card 2023-06-01 to 2024-05-31, one period from
# 2023-06-01 to 2024-03-15. Unemployment after it: Mar 16 to 31 (16), April (30), May (31),
# 77 days, under 90. Had the row been in force, the report would be 2024-03-15 plus 10 days:
# 2024-03-25.
CASE_2024: dict[str, Any] = with_changes(
    CASE_27,
    program_end_date="2023-05-15",
    opt=ead("2023-04-01", "2023-04-10", "2023-06-01", "2024-05-31"),
    employment=[job("2023-06-01", "2024-03-15")],
)


def test_point_56_a_clock_at_2016_10_01_gives_an_output_for_an_opt_case_with_a_period():
    out = run(CASE_2016, CLOCK_2016, pack=shipped())
    assert contract_problems(out) == []


def test_point_56_a_clock_at_2024_09_01_gives_an_output_for_an_opt_case_with_a_period():
    out = run(CASE_2024, CLOCK_2024, pack=shipped())
    assert contract_problems(out) == []


def test_point_56_a_clock_at_2016_10_01_gives_an_output_for_an_open_period():
    # The period of CASE_2016 left open: the card ended 2016-05-31, so point 43 raises
    # employment.period_open_after_last_card. An output all the same.
    case = with_changes(CASE_2016, employment=[job("2015-06-01", None)])
    out = run(case, CLOCK_2016, pack=shipped())
    assert out["verdict"]["state"] == "cannot_tell"
    assert contract_problems(out) == []


def test_point_56_in_2016_the_report_of_an_end_not_reported_is_null_and_steps_back():
    _, out = settle(CASE_2016, CLOCK_2016, chosen={end_reported(1): False}, pack=shipped())
    assert report_by(out, 1)["value"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "talk_to_dso"
    assert contract_problems(out) == []


def test_point_56_in_2024_the_report_of_an_end_not_reported_is_null_and_steps_back():
    _, out = settle(CASE_2024, CLOCK_2024, chosen={end_reported(1): False}, pack=shipped())
    assert report_by(out, 1)["value"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "talk_to_dso"
    assert contract_problems(out) == []


def test_point_56_in_2024_an_end_reported_gives_an_output_too():
    _, out = settle(CASE_2024, CLOCK_2024, chosen={end_reported(1): True}, pack=shipped())
    assert contract_problems(out) == []


# The row is looked up for the period's end, not for today. The test pack's row of
# opt.report_employer_within_days moved to take effect 2025-05-19, as the shipped one does;
# the clock is today, 2026-09-29, after it. Program end 2024-05-15, recommended 2024-04-01,
# filed 2024-04-10, card 2024-06-01 to 2025-05-31, one period from the card start.
REPORT_FROM_2025 = copy.deepcopy(PACK)
for _parameter in REPORT_FROM_2025["parameters"]:
    if _parameter["id"] == OPT_REPORT_RULE:
        _parameter["effective_from"] = REPORT_ROW_FROM
ENDS_ON_THE_ROW_DAY: dict[str, Any] = with_changes(
    CASE_27,
    program_end_date="2024-05-15",
    opt=ead("2024-04-01", "2024-04-10", "2024-06-01", "2025-05-31"),
    employment=[job("2024-06-01", REPORT_ROW_FROM)],
)
ENDS_THE_DAY_BEFORE = with_changes(
    ENDS_ON_THE_ROW_DAY, employment=[job("2024-06-01", "2025-05-18")]
)


def test_point_56_an_end_the_day_before_the_row_gives_null_although_today_has_a_row():
    # Looked up for today, the row would give 2025-05-18 plus 10 days: 2025-05-28. Looked up
    # for the end, 2025-05-18, no row is in force.
    _, out = settle(ENDS_THE_DAY_BEFORE, chosen={end_reported(1): False}, raw_pack=REPORT_FROM_2025)
    assert report_by(out, 1)["value"] is None
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert contract_problems(out) == []


def test_point_56_an_end_on_the_rows_first_day_is_dated():
    # 2025-05-19 plus 10 days: 19 + 10 = 29, within May: 2025-05-29.
    _, out = settle(ENDS_ON_THE_ROW_DAY, chosen={end_reported(1): False}, raw_pack=REPORT_FROM_2025)
    # The test pack's paused grace row is in force from 2000, so grace.ends keeps an
    # alternate after the card and the verdict may be cannot_tell (point 25); the state is
    # not pinned here.
    assert report_by(out, 1)["value"] == "2025-05-29"
    assert NOT_IN_FORCE not in out["verdict"]["reasons"]


def test_point_56_on_the_shipped_pack_an_end_before_the_row_steps_back_to_the_dso():
    # The shipped rows of the paused regime take effect 2026-09-15; the card ended
    # 2025-05-31, so grace.ends (2025-07-30) has no alternate and the state is the step back.
    _, out = settle(ENDS_THE_DAY_BEFORE, chosen={end_reported(1): False}, pack=shipped())
    assert report_by(out, 1)["value"] is None
    assert out["verdict"]["state"] == "talk_to_dso"
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


# The property of point 56 with the two clocks of note 6: every OPT case with an
# employment period gives an output, never an error, on the shipped pack. Every period ends
# on or before the clock, so before 2025-05-19: each end's report, where the output holds
# one, is null with the step back. Point 55 holds on each output too.


@st.composite
def opt_case_on(draw: st.DrawFn, today: date) -> dict[str, Any]:
    """An OPT case with one or two employment periods, every date on or before today but
    the card's end. The program ends 61 to 1500 days before today; the card begins 1 to 60
    days after it (or, for point 27, 1 to 60 days before it) and runs 1 to 12 months. The
    OPT was recommended 30 days before the program end and filed 5 days on."""
    program_end = today - timedelta(days=draw(st.integers(min_value=61, max_value=1500)))
    offset = draw(st.integers(min_value=1, max_value=60))
    card_start = program_end + timedelta(days=offset)
    if draw(st.booleans()):
        card_start = program_end - timedelta(days=offset)
    card_end = months_later(card_start, draw(st.integers(min_value=1, max_value=12))) - ONE_DAY
    recommended = min(program_end, card_start) - timedelta(days=30)
    last = min(today, card_end)
    first_start = min(card_start + timedelta(days=draw(st.integers(0, 20))), last)
    first_end: date | None = None
    if draw(st.booleans()):
        first_end = min(first_start + timedelta(days=draw(st.integers(0, 400))), last)
    periods = [job(iso(first_start), None if first_end is None else iso(first_end))]
    if first_end is not None and first_end < last and draw(st.booleans()):
        second_start = min(first_end + timedelta(days=draw(st.integers(1, 30))), last)
        periods.append(job(iso(second_start), None if draw(st.booleans()) else iso(last)))
    return with_changes(
        CASE_27,
        program_end_date=iso(program_end),
        opt=ead(
            iso(recommended), iso(recommended + timedelta(days=5)), iso(card_start), iso(card_end)
        ),
        employment=periods,
    )


def answer_everything(yes_to_conflicts: bool) -> Callable[[str], bool]:
    """Every end answered not reported, every conflict answered as drawn, the rest as
    default_answer does."""

    def answer(question_id: str) -> bool:
        if question_id.endswith(".end_reported"):
            return False
        if question_id in CONFLICTS:
            return yes_to_conflicts
        return default_answer(question_id)

    return answer


SHIPPED = shipped()


def check_before_the_report_row(case: dict[str, Any], today: date, yes: bool) -> None:
    assert case_problems(case) == []
    for out in (
        run(case, today, pack=SHIPPED),
        settle_with(case, today, answer_everything(yes), pack=SHIPPED)[1],
    ):
        assert contract_problems(out) == []
        assert null_alternates(out) == []
        reports = [e for e in items(out).values() if e["id"].endswith(".end_report_by")]
        for report in reports:
            assert report["value"] is None, report["id"]
        if reports:
            assert NOT_IN_FORCE in out["verdict"]["reasons"]


@settings(deadline=None, max_examples=25)
@given(st.data(), st.booleans())
def test_point_56_with_the_clock_at_2016_10_01_every_opt_case_with_a_period_gives_an_output(
    data, yes
):
    check_before_the_report_row(data.draw(opt_case_on(CLOCK_2016)), CLOCK_2016, yes)


@settings(deadline=None, max_examples=25)
@given(st.data(), st.booleans())
def test_point_56_with_the_clock_at_2024_09_01_every_opt_case_with_a_period_gives_an_output(
    data, yes
):
    check_before_the_report_row(data.draw(opt_case_on(CLOCK_2024)), CLOCK_2024, yes)
