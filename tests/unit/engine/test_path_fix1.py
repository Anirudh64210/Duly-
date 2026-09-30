"""engine/path.py with the shipped F-1 pack: specs/product-2/resolutions.md points 3 to 9.

Each test sends the input reviews/product-2.md names for the finding it answers, straight
to engine.path.compute with the shipped packs (engine.rulepack.load_all), so it holds
whatever the api does. Cases come from tests/unit/acceptance/test_journeys.py, the
journeys of specs/path-1/journeys.json as records. Today is 2026-09-29 in
America/New_York, through an injected FixedClock.

These fail until the build round: each names the finding it answers.
"""

import copy
from typing import Any

from engine import path
from engine.rulepack import load_all
from tests.support.records_case import (
    CLOCK,
    question_ids,
    reasons,
    stage,
    value,
)
from tests.unit.acceptance import test_journeys as journeys


def _compute(body: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = path.compute(body, load_all(), CLOCK)
    return out


def _without(body: dict[str, Any], *record_ids: str) -> dict[str, Any]:
    changed = copy.deepcopy(body)
    changed["records"] = [r for r in changed["records"] if r["id"] not in record_ids]
    return changed


def _set(body: dict[str, Any], record_id: str, **fields: Any) -> dict[str, Any]:
    changed = copy.deepcopy(body)
    for r in changed["records"]:
        if r["id"] == record_id:
            r["fields"].update(fields)
    return changed


# Point 3: a field path through a link reads the linked record (finding 2, J08).


def test_point3_a_change_of_level_ends_opt_the_day_before_the_new_program_starts() -> None:
    # programs.md section 11 and the opt_post span of section 14: the optional member
    # day_before first(move from p1 whose to_program.level differs).to_program.start_date.
    # to_program is p2, start 2025-01-13, so the day before is 2025-01-12. Card end
    # 2025-06-02 is later, so the earliest is 2025-01-12. Fails while _first reads
    # r["fields"].get("to_program.start_date") and finds nothing.
    out = _compute(journeys.j08())
    assert stage(out, "opt_post.a1")["ends"] == "2025-01-12"


def test_point3_the_link_is_read_from_the_record_it_names() -> None:
    # The same case with p2 starting 2025-03-03: the day before is 2025-03-02. A fixed
    # date or a date read from another record would not move with it.
    out = _compute(_set(journeys.j08(), "p2", start_date="2025-03-03"))
    assert stage(out, "opt_post.a1")["ends"] == "2025-03-02"


def test_point3_a_move_at_the_same_level_does_not_end_the_card_the_day_before() -> None:
    # The day_before member reads to_program.level differs_from outer.program.level. With
    # p2 at the bachelor's level too, and no release date, only card_end is left: 2025-06-02.
    out = _compute(_set(journeys.j08(), "p2", level="bachelor"))
    assert stage(out, "opt_post.a1")["ends"] == "2025-06-02"


# Point 4: grace and unemployment end at the cap-gap end while a cap-gap is active
# (findings 3 and 6, J12, J13).


def test_point4_grace_starts_after_an_active_cap_gap() -> None:
    # J12: cap_gap.h1 2026-06-01 to 2026-10-01 (validity_start). Section 14 grace span:
    # "the latest end of the program, its cards and its cap-gap": 2026-10-01. So grace
    # starts 2026-10-02 and is not done on 2026-09-29.
    out = _compute(journeys.j12())
    grace = stage(out, "grace.p1")
    assert grace["starts"] == "2026-10-02"
    assert grace["state"] == "later"


def test_point4_unemployment_runs_through_the_cap_gap() -> None:
    # J13 with the job ending with the card on 2026-06-30. Section 14 counter
    # unemployment.opt_card: "each opt_post: its span, extended by its cap-gap". The
    # cap-gap runs 2026-07-01 to 2026-08-14 (denied). Days without work: July (31) and
    # August 1-14 (14) = 45. On the card alone the count would be 0.
    out = _compute(_set(journeys.j13(), "w1", end="2026-06-30"))
    assert value(out, "unemployment.opt_card.a1") == 45


def test_point4_unemployment_total_runs_through_the_cap_gap_on_stem() -> None:
    # J14: 40 on OPT, 35 on STEM, and 2026-07-16 to 2026-07-25 in the cap-gap (10): 85.
    out = _compute(journeys.j14())
    assert value(out, "unemployment.total.a1") == 85


# Point 5: a count that reads a list is null until the list is stated whole (finding 4).


def test_point5_no_unemployment_count_while_the_work_list_is_not_stated_whole() -> None:
    # J12 with no work records and no statement for work: the review's input. PRINCIPLES 2.
    body = _without(journeys.j12(), "w1")
    del body["complete"]["work"]
    out = _compute(body)
    assert value(out, "unemployment.opt_card.a1") is None
    assert "unemployment.opt_card.at_or_over_limit.a1" not in reasons(out)
    assert "unconfirmed:complete.work" in reasons(out)


def test_point5_the_count_is_given_once_the_list_is_stated_whole() -> None:
    # The other side of the line: J12 with no work and "work" stated whole on 2026-09-29.
    # The span runs through the cap-gap to 2026-10-01 (point 4) and no day after today is
    # counted, so every day from 2025-06-01 to 2026-09-29 counts: June 2025 (30) + July to December
    # (31 + 31 + 30 + 31 + 30 + 31 = 184) + January to August 2026 (31 + 28 + 31 + 30 + 31 +
    # 30 + 31 + 31 = 243) + September 1-29 (29) = 486.
    out = _compute(_without(journeys.j12(), "w1"))
    assert value(out, "unemployment.opt_card.a1") == 486


def test_point5_no_at_or_over_item_on_j01_without_a_work_statement() -> None:
    # The review: J01 holds no work records and no statement, yet at_or_over was raised.
    body = _without(journeys.j01(), "w1", "w2", "e1", "e2")
    del body["complete"]["work"]
    out = _compute(body)
    assert not [r for r in reasons(out) if r.startswith("unemployment.")]
    assert value(out, "unemployment.opt_card.a2") is None


# Point 6: a next stage whose window has closed is not shown as next (finding 5).


def test_point6_j19_the_associates_opt_is_not_next() -> None:
    # p1 end 2023-05-19 plus 60 days: 2023-07-18, three years before today.
    out = _compute(journeys.j19())
    assert all(s["state"] != "next" for s in out["stages"] if s["id"] == "opt_post.p1")


def test_point6_j01_the_bachelors_stem_is_not_next() -> None:
    # a1 card end 2024-06-18 closes stem.apply_window.a1.
    out = _compute(journeys.j01())
    assert all(s["state"] != "next" for s in out["stages"] if s["id"] == "stem.a1")


def test_point6_a_next_stage_whose_window_is_ahead_is_still_next() -> None:
    # The other side: J01's master's card ends 2027-06-14, its STEM window opens
    # 2027-03-16 and closes 2027-06-14, ahead of today.
    out = _compute(journeys.j01())
    assert stage(out, "stem.a2")["state"] == "next"


# Point 7: stem.basis_ten_years_end, the CPT step back, lists, ends_also (findings 8, 10,
# notes 13 and 14).


def test_point7_the_ten_years_after_a_basis_degree_are_shown() -> None:
    # J02: conferred 2018-05-19 plus 10 years = 2028-05-19; marked as Duly's reading
    # (programs.md section 14).
    out = _compute(journeys.j02())
    item = [i for i in out["computed"] if i["id"] == "stem.basis_ten_years_end.p1"]
    assert [i["value"] for i in item] == ["2028-05-19"]
    assert item[0]["reading"] is True
    assert item[0]["record"] == "p1"


def test_point7_ten_years_from_a_leap_day_is_28_february() -> None:
    # programs.md section 13 point 12: 29 February becomes 28 February. Conferred
    # 2016-02-29 plus 10 years: 2026-02-29 does not exist, so 2026-02-28.
    out = _compute(_set(journeys.j02(), "p1", conferred_on="2016-02-29"))
    assert value(out, "stem.basis_ten_years_end.p1") == "2026-02-28"


def test_point7_cpt_days_over_and_months_under_the_bar_step_back() -> None:
    # J06: 370 days (over 365), months under 12. Section 14: "When the two CPT counts
    # disagree on the bar, the verdict steps back". The id is not named in the SPEC, so
    # the test asks for a CPT judgement item beyond the days' own at_or_over item.
    out = _compute(journeys.j06())
    assert value(out, "cpt.full_time_days_at_level.master") == 370
    assert value(out, "cpt.full_time_months_at_level.master") < 12
    extra = [
        r
        for r in reasons(out)
        if r.startswith("cpt.") and r != "cpt.full_time_days_at_level.at_or_over_limit.master"
    ]
    assert extra, reasons(out)


def test_point7_cpt_under_both_bars_raises_no_step_back() -> None:
    # The other side: J06 without a3 and a4: 89 + 124 = 213 days, under both bars.
    out = _compute(_without(journeys.j06(), "a3", "a4"))
    assert value(out, "cpt.full_time_days_at_level.master") == 213
    assert not [r for r in reasons(out) if r.startswith("cpt.")]


def test_point7_lists_carry_the_stages_lists() -> None:
    # Note 13: opt_post declares lists: [stem.requirements]; the output's lists holds it
    # for the record of the stage (contracts/engine_output.schema.json lists).
    out = _compute(journeys.j01())
    ids = {(item["id"], item.get("record")) for item in out["lists"]}
    assert ("stem.requirements", "a2") in ids


def test_point7_ends_also_two_readings_of_an_end_give_the_judgement_item() -> None:
    # programs.md section 11: J08 with a release date 2024-12-20 set by the DSO. The
    # regulation's end is the day before p2 starts (2025-01-12), SEVP's guidance is the
    # release date (2024-12-20). They differ: the end is null and
    # opt_post.end_by_source.a1 is raised (talk_to_dso).
    out = _compute(_set(journeys.j08(), "mv1", release_date="2024-12-20"))
    assert "opt_post.end_by_source.a1" in reasons(out)
    assert stage(out, "opt_post.a1")["ends"] is None


def test_point7_ends_also_one_reading_raises_no_item() -> None:
    # J04's transfer: the release date 2022-08-15 is both readings. No end_by_source item.
    out = _compute(journeys.j04())
    assert not [r for r in reasons(out) if ".end_by_source." in r]


# Point 8: the pack asks only what section 17 asks (finding 9).


def test_point8_cpt_is_not_asked_for_a_decision() -> None:
    # J03 and J06: decision is asked "all but cpt" (section 10).
    asked = question_ids(_compute(journeys.j03())) + question_ids(_compute(journeys.j06()))
    assert not [q for q in asked if q.endswith(".decision")]


def test_point8_no_stem_list_for_a_degree_earned_abroad() -> None:
    # J16: p0 is outside_us, never a STEM basis (section 14).
    assert "p0.stem_list" not in question_ids(_compute(journeys.j16()))


def test_point8_nothing_about_stem_for_english_language_training() -> None:
    # J19: p0 is language_training.
    asked = question_ids(_compute(journeys.j19()))
    assert "p0.stem_list" not in asked
    assert "p0.conferred_on" not in asked


def test_point8_stem_list_is_still_asked_when_a_basis_turns_on_it() -> None:
    # The other side: J02 with p1's stem_list left out. p1 could be the basis, so it is
    # asked (section 17 point 3).
    body = copy.deepcopy(journeys.j02())
    del body["records"][0]["fields"]["stem_list"]
    assert "p1.stem_list" in question_ids(_compute(body))


# Point 9: the litigation reason only when an item shown carries an alternate with a
# different value (product-1 points 25 and 49).


def test_point9_no_litigation_reason_when_no_shown_item_has_a_different_alternate() -> None:
    # J10 case A: a transfer and no card. The rows it reads (transfer.* 5 months and 15
    # days) have no alternate with another value, no grace is computed for p1 (a move
    # leaves it), and p1's OPT windows closed on 2025-07-15, so opt_post.p1 is not shown
    # (point 6). So rule_in_litigation is not a reason.
    out = _compute(journeys.j10())
    assert "rule_in_litigation" not in reasons(out)


def test_point9_litigation_reason_when_grace_has_a_different_alternate() -> None:
    # J11: grace.p1 counts from 2026-09-30, where grace.after_completion_days has the
    # operative 60 and the enjoined 30. The item shown carries a different alternate.
    out = _compute(journeys.j11())
    assert "rule_in_litigation" in reasons(out)
