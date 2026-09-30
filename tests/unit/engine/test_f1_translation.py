"""Today's F-1 case translated onto records: engine.f1.to_records and compute_f1_records.

Specified in specs/path-1/programs.md section 19 ("The F-1 case of today, translated") and
specs/product-2/resolutions.md point 1: "`compute_f1_records` is the translation of today's
case onto records and path.py (programs.md section 19). `compute_f1` stays as it is".

Three groups:
- each row of the section 19 table: a case_f1 field lands in the records case as the row says;
- compute_f1_records gives what engine/path.py gives for the records the table writes, here
  written out by hand from the table, never read back from to_records;
- a difference from compute_f1 is one of the four section 19 names, each asserted as such,
  and every item today's engine computes that the path also computes has the same value.

Cases are built with the case_f1 helpers of tests/support/f1_pack.py and read with the shipped
F-1 pack (engine.rulepack.load_all), which holds the path. Today is 2026-09-30 in UTC through
an injected FixedClock. Every date below is worked by hand beside its assertion.
"""

from datetime import date
from typing import Any

from engine import f1, path
from engine.rulepack import Rulepack, load_all
from tests.support.f1_pack import (
    EARLIER,
    NOTHING_MORE,
    about_asked,
    cap_gap,
    clock_on,
    ead,
    job,
)

TODAY = date(2026, 9, 30)
CLOCK = clock_on(TODAY)
ON = "2026-09-30"


def _answers(on: str, given: dict[str, bool]) -> dict[str, Any]:
    """Answers as tests.support.f1_pack.answers gives them: each dated `on`, each with the
    about naming its question."""
    return {q: {"answer": a, "on": on, "about": about_asked(q)} for q, a in given.items()}


def _pack() -> Rulepack:
    return next(p for p in load_all() if p.category == "f1")


PACK = _pack()
KINDS = [kind["id"] for kind in (PACK.path or {})["records"]]


def _raw(**changes: Any) -> dict[str, Any]:
    """A case_f1 case: a master's program that ended 2026-05-15, nothing else entered."""
    raw: dict[str, Any] = {
        "program_end_date": "2026-05-15",
        "degree_level": "master",
        "documents_count": 0,
        "cpt_full_time_days": None,
        "opt": None,
        "stem": None,
        "employment": [],
        "cap_gap": None,
        "time_zone": "UTC",
        "confirmations": {},
    }
    raw.update(changes)
    return raw


def _records(**changes: Any) -> dict[str, Any]:
    out: dict[str, Any] = f1.to_records(f1.parse_case(_raw(**changes), CLOCK), PACK)
    return out


def _by_id(records_case: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {r["id"]: r for r in records_case["records"]}


def _both(**changes: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    """(compute_f1_records, compute_f1) for the same case, pack and clock."""
    case = f1.parse_case(_raw(**changes), CLOCK)
    return f1.compute_f1_records(case, PACK, CLOCK), f1.compute_f1(case, PACK, CLOCK)


def _values(out: dict[str, Any]) -> dict[str, Any]:
    return {i["id"]: i.get("value", i.get("date")) for i in out["computed"]}


def _question_ids(out: dict[str, Any]) -> list[str]:
    return [q["id"] for q in out["questions"]]


# The OPT card of the cases below: recommended 2026-03-01, filed 2026-03-10, card 2026-06-01
# to 2027-05-31. The job starts 2026-06-15 and has no end.
OPT = ead("2026-03-01", "2026-03-10", "2026-06-01", "2027-05-31")
# The STEM case: a program that ended 2025-05-15, OPT 2025-06-01 to 2026-05-31, STEM
# recommended 2026-03-01, filed 2026-03-15, card 2026-06-01 to 2028-05-31.
OPT_2025 = ead("2025-03-01", "2025-03-10", "2025-06-01", "2026-05-31")
STEM = ead("2026-03-01", "2026-03-15", "2026-06-01", "2028-05-31")
WHOLE = _answers(ON, {NOTHING_MORE: True, EARLIER: False})


# Section 19, row "program_end_date, degree_level": p1: where us_on_f1, level, end_date.


def test_the_program_is_p1_on_f1_with_its_level_and_end_date() -> None:
    body = _records()
    assert body["records"] == [
        {
            "id": "p1",
            "kind": "program",
            "fields": {"where": "us_on_f1", "level": "master", "end_date": "2026-05-15"},
        }
    ]


def test_the_records_case_names_the_pack_category_and_the_time_zone() -> None:
    # contracts/case.schema.json: categories, time_zone, facts, records, complete,
    # confirmations. Nothing entered gives no statement and no answer.
    body = _records(time_zone="America/New_York")
    assert body["categories"] == ["f1"]
    assert body["time_zone"] == "America/New_York"
    assert body["facts"] == {}
    assert body["complete"] == {}
    assert body["confirmations"] == {}


# Row "cpt_full_time_days": p1.cpt_days_stated, only when entered.


def test_cpt_days_entered_land_in_p1_cpt_days_stated() -> None:
    assert _by_id(_records(cpt_full_time_days=171))["p1"]["fields"]["cpt_days_stated"] == 171


def test_cpt_days_of_zero_are_kept_as_zero() -> None:
    # Zero is an answer; only nothing entered stays absent (F1Case: None is never zero).
    assert _by_id(_records(cpt_full_time_days=0))["p1"]["fields"]["cpt_days_stated"] == 0


def test_cpt_days_not_entered_are_absent_not_zero() -> None:
    assert "cpt_days_stated" not in _by_id(_records())["p1"]["fields"]


# Row "opt": a1: opt_post_completion, program p1, dso_on, filed_on, card dates; approved when
# the card dates are present.


def test_opt_is_a1_with_its_dates_and_approved_when_the_card_dates_are_present() -> None:
    assert _by_id(_records(opt=OPT))["a1"] == {
        "id": "a1",
        "kind": "authorization",
        "fields": {
            "type": "opt_post_completion",
            "program": "p1",
            "dso_on": "2026-03-01",
            "filed_on": "2026-03-10",
            "card_start": "2026-06-01",
            "card_end": "2027-05-31",
            "decision": "approved",
        },
    }


def test_opt_with_no_card_dates_is_not_approved_and_holds_no_card_date() -> None:
    fields = _by_id(_records(opt=ead("2026-03-01", None, None, None)))["a1"]["fields"]
    assert fields == {"type": "opt_post_completion", "program": "p1", "dso_on": "2026-03-01"}


def test_opt_with_a_card_start_and_no_card_end_is_not_approved() -> None:
    # "approved when the card dates are present": both of them.
    fields = _by_id(_records(opt=ead(None, "2026-03-10", "2026-06-01", None)))["a1"]["fields"]
    assert "decision" not in fields
    assert fields["card_start"] == "2026-06-01"
    assert "card_end" not in fields


# Row "stem": a2: stem_extension, extends a1, basis_program p1.


def test_stem_is_a2_extending_a1_on_the_basis_of_p1() -> None:
    body = _records(program_end_date="2025-05-15", opt=OPT_2025, stem=STEM)
    assert _by_id(body)["a2"] == {
        "id": "a2",
        "kind": "authorization",
        "fields": {
            "type": "stem_extension",
            "program": "p1",
            "dso_on": "2026-03-01",
            "filed_on": "2026-03-15",
            "card_start": "2026-06-01",
            "card_end": "2028-05-31",
            "decision": "approved",
            "basis_program": "p1",
            "extends": "a1",
        },
    }


def test_stem_with_no_opt_names_no_card_it_extends() -> None:
    # There is no a1 to link to; a link to a record that is not there would be invented.
    body = _records(stem=STEM)
    assert "a1" not in _by_id(body)
    assert "extends" not in _by_id(body)["a2"]["fields"]


# Row "employment[n]": w<n>: under the card that holds its start, hours, end,
# employer_reported.


def test_each_period_is_w_n_in_the_order_entered() -> None:
    body = _records(
        opt=OPT, employment=[job("2026-06-15", "2026-07-31", 30, False), job("2026-08-03", None)]
    )
    records = _by_id(body)
    assert records["w1"] == {
        "id": "w1",
        "kind": "work",
        "fields": {
            "start": "2026-06-15",
            "hours_per_week": 30,
            "employer_reported": False,
            "end": "2026-07-31",
            "under": "a1",
        },
    }
    assert records["w2"]["fields"] == {
        "start": "2026-08-03",
        "hours_per_week": 40,
        "employer_reported": True,
        "under": "a1",
    }


def test_a_period_starting_inside_the_stem_card_is_under_a2() -> None:
    # 2026-07-01 lies after the OPT card end 2026-05-31 and inside 2026-06-01 to 2028-05-31.
    body = _records(
        program_end_date="2025-05-15",
        opt=OPT_2025,
        stem=STEM,
        employment=[job("2025-06-15", "2026-05-31"), job("2026-07-01", None)],
    )
    assert _by_id(body)["w1"]["fields"]["under"] == "a1"
    assert _by_id(body)["w2"]["fields"]["under"] == "a2"


def test_a_period_on_the_first_and_last_card_day_is_under_that_card() -> None:
    # Both ends of the card hold: 2026-06-01 and 2027-05-31 are card days.
    body = _records(opt=OPT, employment=[job("2026-06-01", None), job("2027-05-31", None)])
    assert _by_id(body)["w1"]["fields"]["under"] == "a1"
    assert _by_id(body)["w2"]["fields"]["under"] == "a1"


def test_a_period_outside_every_card_names_no_card() -> None:
    # 2026-05-31 is the day before the card starts; a card with no dates holds no day. The
    # link is then asked, never guessed.
    body = _records(
        opt=OPT,
        stem=ead("2026-03-01", None, None, None),
        employment=[job("2026-05-31", None)],
    )
    assert "under" not in _by_id(body)["w1"]["fields"]


# Row "cap_gap": h1: filed_on, requested_start, change_of_status, outcome; cap_subject yes.


def test_the_cap_gap_is_h1_cap_subject_with_its_dates_and_outcome() -> None:
    body = _records(opt=OPT, cap_gap=cap_gap("2027-10-01", "pending", True, "2027-04-02"))
    assert _by_id(body)["h1"] == {
        "id": "h1",
        "kind": "petition",
        "fields": {
            "type": "h1b",
            "cap_subject": "yes",
            "filed_on": "2027-04-02",
            "requested_start": "2027-10-01",
            "change_of_status": "yes",
            "outcome": "pending",
        },
    }


def test_a_petition_with_no_change_of_status_says_no() -> None:
    body = _records(opt=OPT, cap_gap=cap_gap("2027-10-01", "denied", False))
    fields = _by_id(body)["h1"]["fields"]
    assert fields["change_of_status"] == "no"
    assert fields["outcome"] == "denied"


# Row "confirmations": same ids; nothing_more_to_record and opt.earlier_at_this_level stand
# for the completeness statements they replace.


def test_answers_keep_their_ids_answers_days_and_about() -> None:
    given = {
        "held_post_completion_opt": {"answer": True, "on": "2026-09-28", "about": {"x": "1"}},
        "full_time_cpt_used": {"answer": False, "on": "2026-09-29"},
    }
    assert _records(confirmations=given)["confirmations"] == given


def test_yes_to_nothing_more_states_every_record_list_whole_on_the_day_it_was_given() -> None:
    body = _records(confirmations=_answers("2026-09-29", {NOTHING_MORE: True}))
    assert body["complete"] == {kind: {"on": "2026-09-29"} for kind in KINDS}
    assert "work" in body["complete"]
    assert "trip" in body["complete"]


def test_no_to_nothing_more_states_no_list_whole() -> None:
    assert _records(confirmations=_answers(ON, {NOTHING_MORE: False}))["complete"] == {}


def test_no_to_earlier_opt_at_this_level_states_p1_authorizations_whole() -> None:
    body = _records(confirmations=_answers("2026-09-28", {EARLIER: False}))
    assert body["complete"] == {"authorization:p1": {"on": "2026-09-28"}}


def test_yes_to_earlier_opt_at_this_level_states_nothing_whole() -> None:
    # A yes says there is more at this level than the case holds.
    assert _records(confirmations=_answers(ON, {EARLIER: True}))["complete"] == {}


# compute_f1_records is path.py on the records the table writes (resolutions point 1).


def _hand_written_opt_case() -> dict[str, Any]:
    """The records case section 19 writes for the OPT case, by hand from the table."""
    whole = {"on": ON}
    return {
        "categories": ["f1"],
        "time_zone": "UTC",
        "facts": {},
        "records": [
            {
                "id": "p1",
                "kind": "program",
                "fields": {
                    "where": "us_on_f1",
                    "level": "master",
                    "end_date": "2026-05-15",
                    "cpt_days_stated": 0,
                },
            },
            {
                "id": "a1",
                "kind": "authorization",
                "fields": {
                    "type": "opt_post_completion",
                    "program": "p1",
                    "dso_on": "2026-03-01",
                    "filed_on": "2026-03-10",
                    "card_start": "2026-06-01",
                    "card_end": "2027-05-31",
                    "decision": "approved",
                },
            },
            {
                "id": "w1",
                "kind": "work",
                "fields": {
                    "start": "2026-06-15",
                    "hours_per_week": 40,
                    "employer_reported": True,
                    "under": "a1",
                },
            },
        ],
        "complete": {**dict.fromkeys(KINDS, whole), "authorization:p1": whole},
        "confirmations": WHOLE,
    }


def _opt_case() -> dict[str, Any]:
    return {
        "opt": OPT,
        "cpt_full_time_days": 0,
        "employment": [job("2026-06-15", None)],
        "confirmations": WHOLE,
    }


def test_compute_f1_records_is_path_on_the_hand_written_records() -> None:
    records_out, _ = _both(**_opt_case())
    assert records_out == path.compute(_hand_written_opt_case(), [PACK], CLOCK)


def test_the_opt_dates_through_the_translation() -> None:
    records_out, _ = _both(**_opt_case())
    values = _values(records_out)
    # opt.apply_before_days 90: 2026-05-15 minus 90 days = 2026-02-14 (May 15 - 15 = Apr 30,
    # - 30 = Mar 31, - 31 = Feb 28, - 14 = Feb 14).
    assert values["opt.apply_window.opens.a1"] == "2026-02-14"
    # opt.apply_after_days 60: 2026-05-15 plus 60 = 2026-07-14 (16 to May 31, 30 to Jun 30,
    # 14 more).
    assert values["opt.apply_window.closes.a1"] == "2026-07-14"
    # opt.file_within_days_of_recommendation 30: 2026-03-01 plus 30 = 2026-03-31.
    assert values["opt.file_by.closes.a1"] == "2026-03-31"
    # opt.complete_within_months 14: 2026-05-15 plus 14 months = 2027-07-15.
    assert values["opt.complete_by.closes.a1"] == "2027-07-15"
    # Unemployment on the card: 2026-06-01 to 2026-06-14, the days before the job, is 14.
    assert values["unemployment.opt_card.a1"] == 14


def test_the_stem_dates_through_the_translation() -> None:
    records_out, _ = _both(
        program_end_date="2025-05-15",
        opt=OPT_2025,
        stem=STEM,
        cpt_full_time_days=0,
        employment=[job("2025-06-15", None)],
        confirmations=WHOLE,
    )
    values = _values(records_out)
    # stem.file_within_days_of_recommendation 60: 2026-03-01 plus 60 = 2026-04-30.
    assert values["stem.file_by.closes.a2"] == "2026-04-30"
    # Validation 1: card start plus 6 months, 2026-12-01 (a Tuesday), plus 10 business
    # days: Dec 2, 3, 4, 7, 8, 9, 10, 11, 14, 15 = 2026-12-15.
    assert values["stem.validation_1.closes.a2"] == "2026-12-15"
    # 12-month evaluation: 2026-06-01 plus 12 months = 2027-06-01, plus 10 days = 2027-06-11.
    assert values["stem.evaluation_12_month.closes.a2"] == "2027-06-11"
    # Final evaluation: card end 2028-05-31 plus 10 days = 2028-06-10.
    assert values["stem.evaluation_final.closes.a2"] == "2028-06-10"


# Parity with compute_f1 for every item both compute (section 19: "Parity holds for every
# item that today's engine computes, except these deliberate changes").

# compute_f1 id -> path id, for the OPT case. The latest start is the close of the window.
OPT_PARITY = {
    "opt.apply_window_opens": "opt.apply_window.opens.a1",
    "opt.apply_window_closes": "opt.apply_window.closes.a1",
    "opt.latest_start": "opt.latest_start.closes.a1",
    "opt.file_by": "opt.file_by.closes.a1",
    "opt.complete_by": "opt.complete_by.closes.a1",
    "unemployment.days_used": "unemployment.opt_card.a1",
}
STEM_PARITY = {
    "stem.apply_window_opens": "stem.apply_window.opens.a2",
    "stem.apply_window_closes": "stem.apply_window.closes.a2",
    "stem.file_by": "stem.file_by.closes.a2",
    "stem.validation_1_due": "stem.validation_1.closes.a2",
    "stem.validation_2_due": "stem.validation_2.closes.a2",
    "stem.validation_3_due": "stem.validation_3.closes.a2",
    "stem.evaluation_12_month_due": "stem.evaluation_12_month.closes.a2",
    "stem.final_evaluation_due_from_ead_end": "stem.evaluation_final.closes.a2",
    "unemployment.opt_card_days_used": "unemployment.opt_card.a1",
}


def test_the_opt_dates_and_count_match_compute_f1() -> None:
    records_out, today_out = _both(**_opt_case())
    got, was = _values(records_out), _values(today_out)
    assert {new: got[new] for new in OPT_PARITY.values()} == {
        new: was[old] for old, new in OPT_PARITY.items()
    }


def test_the_stem_dates_match_compute_f1() -> None:
    records_out, today_out = _both(
        program_end_date="2025-05-15",
        opt=OPT_2025,
        stem=STEM,
        cpt_full_time_days=0,
        employment=[job("2025-06-15", "2026-05-31"), job("2026-06-01", None)],
        confirmations=WHOLE,
    )
    got, was = _values(records_out), _values(today_out)
    assert {new: got[new] for new in STEM_PARITY.values()} == {
        new: was[old] for old, new in STEM_PARITY.items()
    }


def test_the_verdict_state_matches_compute_f1_on_the_opt_case() -> None:
    # Neither engine gives the quiet state here: no document is typed in (documents_count 0).
    records_out, today_out = _both(**_opt_case())
    assert records_out["verdict"]["state"] == "cannot_tell"
    assert today_out["verdict"]["state"] == "cannot_tell"
    assert "no_documents" in records_out["verdict"]["reasons"]
    assert "no_documents" in today_out["verdict"]["reasons"]


# Change 1: the STEM next step waits for p1.stem_list. OPT and no STEM gains the question.


def test_change_1_opt_and_no_stem_gains_the_question_p1_stem_list() -> None:
    records_out, today_out = _both(**_opt_case())
    assert "p1.stem_list" in _question_ids(records_out)
    assert "missing:p1.stem_list" in records_out["verdict"]["reasons"]
    assert "p1.stem_list" not in _question_ids(today_out)


def test_change_1_no_opt_raises_no_stem_list_question() -> None:
    records_out, _ = _both(program_end_date="2027-05-14", confirmations=WHOLE)
    assert "p1.stem_list" not in _question_ids(records_out)


# Change 3: record.ends_before_today where today is past the last span.


def test_change_3_a_record_that_ends_before_today_is_asked_about() -> None:
    # The OPT card ends 2026-05-31, before today 2026-09-30; no STEM, no petition.
    records_out, today_out = _both(
        program_end_date="2025-05-15",
        opt=OPT_2025,
        cpt_full_time_days=0,
        employment=[job("2025-06-15", "2026-05-31")],
        confirmations=WHOLE,
    )
    assert "record.ends_before_today" in _question_ids(records_out)
    assert "unconfirmed:record.ends_before_today" in records_out["verdict"]["reasons"]
    assert "record.ends_before_today" not in _question_ids(today_out)
    asked = next(q for q in records_out["questions"] if q["id"] == "record.ends_before_today")
    assert asked["about"] == {"ends": "2026-05-31"}


def test_change_3_a_record_still_running_is_not_asked_about() -> None:
    records_out, _ = _both(**_opt_case())
    assert "record.ends_before_today" not in _question_ids(records_out)


# Change 4: a denied petition states no grace date after it.


def test_change_4_a_denied_petition_gives_no_grace_date() -> None:
    records_out, today_out = _both(**_opt_case(), cap_gap=cap_gap("2027-10-01", "denied"))
    # Today's engine counts grace from the card end: 2027-05-31 plus 60 = 2027-07-30.
    assert _values(today_out)["grace.ends"] == "2027-07-30"
    stages = [s["id"] for s in records_out["stages"]]
    assert not [s for s in stages if s.startswith("grace")]
    assert not [i for i in _values(records_out) if i.startswith("grace")]
    assert "grace.after_cap_gap_outcome.h1" in records_out["verdict"]["reasons"]
