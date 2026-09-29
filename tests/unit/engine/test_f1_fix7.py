"""engine/f1.py: the seventh fix. specs/product-1/SPEC-resolutions.md, point 63.

Point 63: when whole_shown finds no row for a rule that decides which items exist (the
validation interval, the extension length), the verdict steps back with
rule_not_in_force_on_event_day, as every other missing row does since point 59. A missing
row never leaves a quiet verdict. CLAUDE.md: "A verdict never falls back to the quiet state.
Missing, stale, conflicting, or litigated means cannot_tell."

The case is reviews/product-1-fix6.md, finding 4: the STEM_CASE of
tests/unit/engine/test_f1_fix6.py on
pack_dict(TODAY, leave_out=("stem.validation_interval_months",)), or with
stem.extension_months left out, answered no in full. The review saw no_open_items with no
reasons.

Written before the engine has it, from the SPEC and the contracts, never from the engine.
The clock is injected at noon UTC on the day of each case; every answer is given on that
day with the about the output asked it with (points 2 and 7). Every expected date and count
was worked out by hand. The working is beside it.
"""

import copy
from collections.abc import Callable
from datetime import date, timedelta
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from engine import f1
from engine.rulepack import validate_pack
from tests.support.f1_pack import (
    CONFLICT_IDS,
    CPT_USED,
    NOT_AFTER_PROGRAM_END,
    WINDOW_CONFLICT_IDS,
    case_problems,
    clock_on,
    contract_problems,
    ead,
    job,
    pack_dict,
    refuse_placeholders,
    values,
    with_changes,
)

TODAY = date(2026, 9, 29)
ONE_DAY = timedelta(days=1)

NOT_IN_FORCE = "rule_not_in_force_on_event_day"
QUIET = "no_open_items"
EARLIER = "opt.earlier_at_this_level"
OPEN_AFTER = "employment.period_open_after_last_card"
CONFLICTS = {*CONFLICT_IDS, *WINDOW_CONFLICT_IDS, NOT_AFTER_PROGRAM_END, OPEN_AFTER}

INTERVAL = "stem.validation_interval_months"
EXTENSION = "stem.extension_months"
VALIDATIONS = ("stem.validation_1_due", "stem.validation_2_due", "stem.validation_3_due")


def run(case: dict[str, Any], today: date, raw_pack: dict[str, Any]) -> dict[str, Any]:
    """Compute a case with the clock injected at noon UTC on today. The test pack is
    checked on today, so the age of the rules never decides a verdict."""
    assert case_problems(case) == [], "the test case itself must match the case contract"
    clock = clock_on(today)
    pack = validate_pack(raw_pack)
    return f1.compute_f1(f1.parse_case(refuse_placeholders(case), clock), pack, clock)


def answer_no(question_id: str) -> bool:
    """Finding 4's "answered no in full", as answer_with(False) in test_f1_fix6.py: every
    conflict answered no, full-time CPT not used, a new employer and earlier OPT at the level
    not assumed, every other question answered yes."""
    if question_id in CONFLICTS or question_id == CPT_USED:
        return False
    return not (question_id.endswith(".new_employer") or question_id == EARLIER)


def settle_with(
    case: dict[str, Any],
    today: date,
    answer: Callable[[str], bool],
    raw_pack: dict[str, Any],
) -> dict[str, Any]:
    """Answer every question the output asks, in the order it asks them (an answer can
    raise another), on today with the about as asked, as the screen does. Returns the last
    output."""
    out = run(case, today, raw_pack)
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
        out = run(case, today, raw_pack)
    return out


def validation_ids(out: dict[str, Any]) -> list[str]:
    return sorted(i for i in values(out) if i.startswith("stem.validation_") and "_due" in i)


# The STEM case of reviews/product-1-fix6.md, finding 4, which is the STEM_CASE of
# tests/unit/engine/test_f1_fix6.py: program end 2025-02-15; OPT recommended 2025-01-20
# (26 days before the program end), filed 2025-01-25, card 2025-03-13 to 2026-03-12 (12
# months from 2025-03-13 is 2026-03-13, less a day); STEM recommended 2026-01-10, filed
# 2026-01-15 (56 days before the OPT card ends), card 2026-03-13 to 2028-03-12 (24 months
# from 2026-03-13 is 2028-03-13, less a day); one period open from the OPT card's start.
STEM_CASE: dict[str, Any] = {
    "program_end_date": "2025-02-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2025-01-20", "2025-01-25", "2025-03-13", "2026-03-12"),
    "stem": ead("2026-01-10", "2026-01-15", "2026-03-13", "2028-03-12"),
    "employment": [job("2025-03-13", None)],
    "cap_gap": None,
    "time_zone": "UTC",
}
STEM_START = date(2026, 3, 13)
STEM_END = date(2028, 3, 12)

PLAIN = pack_dict(TODAY)
WITHOUT_INTERVAL = pack_dict(TODAY, leave_out=(INTERVAL,))
WITHOUT_EXTENSION = pack_dict(TODAY, leave_out=(EXTENSION,))
WITHOUT_BOTH = pack_dict(TODAY, leave_out=(INTERVAL, EXTENSION))


def rule_ids(raw_pack: dict[str, Any]) -> set[str]:
    return {p["id"] for p in raw_pack["parameters"]}


def test_the_case_and_the_packs_of_this_file_are_as_finding_4_says() -> None:
    assert case_problems(STEM_CASE) == []
    # Today lies inside the STEM card, after its start: every filing lies before today.
    assert STEM_START <= TODAY <= STEM_END
    assert {INTERVAL, EXTENSION} <= rule_ids(PLAIN)
    assert INTERVAL not in rule_ids(WITHOUT_INTERVAL)
    assert EXTENSION in rule_ids(WITHOUT_INTERVAL)
    assert EXTENSION not in rule_ids(WITHOUT_EXTENSION)
    assert INTERVAL in rule_ids(WITHOUT_EXTENSION)
    assert not {INTERVAL, EXTENSION} & rule_ids(WITHOUT_BOTH)
    # Nothing else is left out: one rule fewer each, two fewer for both.
    assert len(rule_ids(WITHOUT_INTERVAL)) == len(rule_ids(PLAIN)) - 1
    assert len(rule_ids(WITHOUT_EXTENSION)) == len(rule_ids(PLAIN)) - 1
    assert len(rule_ids(WITHOUT_BOTH)) == len(rule_ids(PLAIN)) - 2


# The control. On the plain test pack both rows are in force from 2000-01-01, so nothing
# steps back for a missing row. STEM card 2026-03-13 to 2028-03-12: 24 months // 6 = 4
# reports, due 2026-09-13, 2027-03-13, 2027-09-13 and 2028-03-13; the fourth lies after the
# card's end 2028-03-12 and is not given (point 48), so three are listed.


def test_point_63_the_control_on_the_plain_pack_lists_three_reports_and_does_not_step_back() -> (
    None
):
    out = settle_with(STEM_CASE, TODAY, answer_no, PLAIN)
    assert contract_problems(out) == []
    assert validation_ids(out) == list(VALIDATIONS)
    assert NOT_IN_FORCE not in out["verdict"]["reasons"]


# Finding 4 without stem.validation_interval_months. With no interval the number of reports
# (24 // interval) is not known, so none is listed (point 59), and the verdict must say a
# row is missing rather than say nothing is open.


def test_point_63_finding_4_without_the_interval_is_never_the_quiet_verdict() -> None:
    # The review saw {"state": "no_open_items", "reasons": []}.
    out = settle_with(STEM_CASE, TODAY, answer_no, WITHOUT_INTERVAL)
    assert contract_problems(out) == []
    assert out["verdict"]["state"] != QUIET


def test_point_63_finding_4_without_the_interval_carries_rule_not_in_force() -> None:
    out = settle_with(STEM_CASE, TODAY, answer_no, WITHOUT_INTERVAL)
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


def test_point_63_finding_4_without_the_interval_still_lists_no_report() -> None:
    # Point 59 stands: the step back is added, no report is made up from a missing row.
    out = settle_with(STEM_CASE, TODAY, answer_no, WITHOUT_INTERVAL)
    assert validation_ids(out) == []


def test_point_63_without_the_interval_the_first_output_already_steps_back() -> None:
    # Before any answer: the missing row does not wait for the questions.
    out = run(STEM_CASE, TODAY, WITHOUT_INTERVAL)
    assert contract_problems(out) == []
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] != QUIET


# Finding 4 without stem.extension_months. With no extension length the months the card may
# run (and so 24 // 6 = 4) are not known, so no report is listed, and the verdict must step
# back.


def test_point_63_finding_4_without_the_extension_length_is_never_the_quiet_verdict() -> None:
    # The review saw {"state": "no_open_items", "reasons": []}.
    out = settle_with(STEM_CASE, TODAY, answer_no, WITHOUT_EXTENSION)
    assert contract_problems(out) == []
    assert out["verdict"]["state"] != QUIET


def test_point_63_finding_4_without_the_extension_length_carries_rule_not_in_force() -> None:
    out = settle_with(STEM_CASE, TODAY, answer_no, WITHOUT_EXTENSION)
    assert NOT_IN_FORCE in out["verdict"]["reasons"]


def test_point_63_finding_4_without_the_extension_length_still_lists_no_report() -> None:
    out = settle_with(STEM_CASE, TODAY, answer_no, WITHOUT_EXTENSION)
    assert validation_ids(out) == []


def test_point_63_without_the_extension_length_the_first_output_already_steps_back() -> None:
    out = run(STEM_CASE, TODAY, WITHOUT_EXTENSION)
    assert contract_problems(out) == []
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] != QUIET


def test_point_63_a_pack_without_both_rules_steps_back_and_is_never_quiet() -> None:
    out = settle_with(STEM_CASE, TODAY, answer_no, WITHOUT_BOTH)
    assert contract_problems(out) == []
    assert validation_ids(out) == []
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] != QUIET


# The property: whatever the day the clock reads, from the STEM card's start 2026-03-13 (the
# last filing, 2026-01-15, lies before it, so no filing is after today) to 2030-12-31, well
# past the card's end 2028-03-12, finding 4's case on a pack that lacks either rule or both
# steps back and is never quiet. The clock is injected; the pack is checked on that day.

LEFT_OUT = st.sampled_from(((INTERVAL,), (EXTENSION,), (INTERVAL, EXTENSION)))


@settings(max_examples=25, deadline=None)
@given(today=st.dates(min_value=STEM_START, max_value=date(2030, 12, 31)), leave_out=LEFT_OUT)
def test_point_63_on_any_clock_a_pack_without_the_rules_is_never_quiet(
    today: date, leave_out: tuple[str, ...]
) -> None:
    raw = pack_dict(today, leave_out=leave_out)
    out = settle_with(STEM_CASE, today, answer_no, raw)
    assert contract_problems(out) == []
    assert validation_ids(out) == []
    assert NOT_IN_FORCE in out["verdict"]["reasons"]
    assert out["verdict"]["state"] != QUIET
