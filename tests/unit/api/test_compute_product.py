"""POST /v1/compute/f1 after product round 1.

Specified in specs/product-1/SPEC.md, sections 1 to 6, and the contracts:
  the response carries upcoming and lists, and reading on each item. cpt_full_time_days
  may be null or absent. An answer may carry about. An answer dated after today is
  refused with a 422 in plain words.

The inputs are those of reviews/phase-2-second.md, findings 1, 4, 5 and 6, sent as the
reviewer sent them: the clock at 2026-09-28 18:00 UTC, the zone America/Los_Angeles, so
today is 2026-09-28.

The api loads the shipped f1 pack, whose values and words belong to L-content. The
inputs here lie years from any boundary, so no test turns on a rule value. The
boundaries are tested against the SPEC values in tests/unit/engine/test_f1_product.py.
"""

import logging
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock, get_settings
from api.settings import Settings
from engine.clocks import FixedClock
from tests.support.f1_pack import (
    CPT_USED,
    NO_EMPLOYMENT,
    NOTHING_MORE,
    answer_as_the_screen_does,
    answers,
    cap_gap,
    case_problems,
    conflicts,
    contract_problems,
    ead,
    items,
    job,
    question,
    question_ids,
    upcoming,
    with_block,
    with_changes,
)

URL = "/v1/compute/f1"
UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"

# 11:00 on 2026-09-28 in Los Angeles.
INSTANT = datetime(2026, 9, 28, 18, 0, tzinfo=UTC)
ZONE = "America/Los_Angeles"

# Finding 1: degree_level master, documents_count 2, one open period at 40 hours,
# reported, from the OPT start.
OPT_CARD: dict[str, Any] = {
    "program_end_date": "2025-09-15",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead(None, None, "2025-11-01", "2026-10-31"),
    "employment": [job("2025-11-01", None)],
    "time_zone": ZONE,
}

# Finding 4: the whole body.
NOTHING: dict[str, Any] = {
    "program_end_date": "2026-12-15",
    "degree_level": "master",
    "documents_count": 2,
    "employment": [],
    "time_zone": ZONE,
}

# Finding 5.
NO_JOBS: dict[str, Any] = {
    "program_end_date": "2026-05-20",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead(None, None, "2026-07-10", "2027-07-09"),
    "employment": [],
    "time_zone": ZONE,
}

# Finding 6.
CARD_IN_HAND: dict[str, Any] = {
    "program_end_date": "2026-08-10",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead("2026-07-01", "2026-07-05", "2026-09-01", "2027-08-31"),
    "employment": [job("2026-09-01", None)],
    "time_zone": ZONE,
}

# A day that is easy to spot in a refusal or in a log.
FAR_DAY = "2099-12-31"


@pytest.fixture
def client():
    app.dependency_overrides[get_clock] = lambda: FixedClock(INSTANT)
    # The database address leads nowhere. The route stores nothing, so it never notices.
    app.dependency_overrides[get_settings] = lambda: Settings(database_url=UNREACHABLE)
    yield TestClient(app)
    app.dependency_overrides.clear()


def answered_200(client: TestClient, case: dict[str, Any]) -> dict[str, Any]:
    assert case_problems(case) == [], "the test case itself must match the case contract"
    response = client.post(URL, json=case)
    assert response.status_code == 200, response.text
    out: dict[str, Any] = response.json()
    return out


def computed(client: TestClient, case: dict[str, Any]) -> dict[str, Any]:
    out = answered_200(client, case)
    assert contract_problems(out) == []
    return out


def refused_in_plain_words(response: Any) -> str:
    """The words of a 422. Never a computed answer, never a stack trace."""
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, str)
    assert detail.strip()
    assert "computed" not in response.text
    assert "Traceback" not in response.text
    return detail


# The changed contract


def test_the_response_carries_upcoming_and_lists_and_follows_the_contract(client):
    out = computed(client, CARD_IN_HAND)
    assert out["today"] == {"date": "2026-09-28", "time_zone": ZONE}
    assert isinstance(out["upcoming"], list)
    assert isinstance(out["lists"], list)
    for item in out["computed"]:
        assert isinstance(item["reading"], bool), item["id"]


def test_upcoming_holds_dates_after_today_soonest_first(client):
    out = computed(client, CARD_IN_HAND)
    dates = [entry["date"] for entry in out["upcoming"]]
    assert dates
    assert dates == sorted(dates)
    assert all(day > "2026-09-28" for day in dates)
    # Section 6: the card ends 2027-08-31, and that date is an input, not a rule value.
    assert upcoming(out)["next.opt.card_ends"]["date"] == "2027-08-31"
    assert upcoming(out)["next.stem.apply_window_closes"]["date"] == "2027-08-31"


def test_every_rule_of_upcoming_and_of_lists_is_shown_with_its_words(client):
    out = computed(client, CARD_IN_HAND)
    named = [rule_id for entry in out["upcoming"] for rule_id in entry["rule_ids"]]
    named += [rule_id for entry in out["lists"] for rule_id in entry["rule_ids"]]
    assert named
    for rule_id in named:
        assert out["rules"][rule_id]["quote"].strip(), rule_id
        assert out["rules"][rule_id]["citation"].strip(), rule_id


def test_the_list_for_the_extension_names_rules_of_the_shipped_pack(client):
    out = computed(client, CARD_IN_HAND)
    assert [entry["id"] for entry in out["lists"]] == ["stem.extension.what_the_regulation_lists"]
    listed = out["lists"][0]["rule_ids"]
    # plan.yaml, L-content: at least three rules whose ids begin stem.requires.
    assert len(listed) >= 3
    assert all(rule_id.startswith("stem.requires.") for rule_id in listed)


def test_reading_on_each_item_is_what_the_rules_shown_say(client):
    out = computed(client, CARD_IN_HAND)
    for shown in (*out["computed"], *out["upcoming"]):
        by_rules = any(
            out["rules"][rule_id].get("derivation") == "reading" for rule_id in shown["rule_ids"]
        )
        assert shown["reading"] is by_rules, shown["id"]


# Finding 1


def test_review_1_an_opt_card_of_three_years_is_asked_about(client):
    out = answered_200(client, with_block(OPT_CARD, "opt", ead_end="2028-10-31"))
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == ["opt.card_longer_than_rule"]
    assert question_ids(out) == ["opt.card_longer_than_rule"]


def test_review_1_a_filing_dated_2030_is_asked_about(client):
    out = answered_200(client, with_block(OPT_CARD, "opt", i765_filed_date="2030-01-01"))
    assert out["verdict"]["state"] == "cannot_tell"
    assert set(conflicts(out)) == {
        "opt.i765_filed_date.after_today",
        "opt.i765_filed_date.after_card",
    }


@pytest.mark.parametrize(
    ("filed_on", "requested", "expected"),
    [
        (
            "2027-03-01",
            "2026-10-01",
            {"cap_gap.petition_filed_on.after_today", "cap_gap.petition_filed_on.after_start"},
        ),
        ("2020-01-01", "2020-10-01", {"cap_gap.requested_start.before_training"}),
    ],
)
def test_review_1_a_petition_whose_dates_do_not_fit_is_asked_about(
    client, filed_on, requested, expected
):
    petition = cap_gap(requested, status="approved", petition_filed_on=filed_on)
    out = answered_200(client, with_changes(OPT_CARD, cap_gap=petition))
    assert out["verdict"]["state"] == "cannot_tell"
    assert set(conflicts(out)) == expected
    assert items(out)["capgap.ends"]["value"] is None


def test_review_1_a_stem_card_of_five_years_is_asked_about(client):
    case = with_changes(
        OPT_CARD,
        program_end_date="2023-09-15",
        opt=ead(None, None, "2023-11-01", "2024-10-31"),
        stem=ead(None, None, "2024-11-01", "2029-10-31"),
        employment=[job("2023-11-01", None)],
    )
    out = answered_200(client, case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert conflicts(out) == ["stem.card_longer_than_rule"]
    assert items(out)["grace.ends"]["value"] is None


def test_review_1_four_months_between_the_cards_are_asked_about(client):
    case = with_changes(
        OPT_CARD,
        program_end_date="2024-09-15",
        opt=ead(None, None, "2024-11-01", "2025-10-31"),
        stem=ead(None, None, "2026-03-01", "2028-02-29"),
        employment=[job("2024-11-01", None)],
    )
    out = answered_200(client, case)
    assert out["verdict"]["state"] == "cannot_tell"
    assert set(conflicts(out)) == {"stem.gap_after_opt", "employment.period_outside_cards"}
    assert items(out)["unemployment.days_used"]["value"] is None


def test_the_answer_yes_with_the_about_of_the_question_is_for_the_dso(client):
    case = with_block(OPT_CARD, "opt", ead_end="2028-10-31")
    asked = answered_200(client, case)
    given_yes = {"opt.card_longer_than_rule": True}
    out = answered_200(client, answer_as_the_screen_does(case, asked, "2026-09-28", **given_yes))
    assert out["verdict"]["state"] == "talk_to_dso"
    assert "opt.card_longer_than_rule" in out["verdict"]["reasons"]
    assert question_ids(out) == []


def test_the_response_to_a_conflict_follows_the_contract(client):
    # See "Disputes" in tests/PROGRESS.md: the id of a question may hold no dot in
    # contracts/engine_output.schema.json, and section 1 gives it the id of the conflict.
    out = answered_200(client, with_block(OPT_CARD, "opt", ead_end="2028-10-31"))
    assert contract_problems(out) == []


# Finding 4


def test_review_4_the_body_with_nothing_entered_is_asked_about(client):
    out = computed(client, NOTHING)
    assert out["verdict"]["state"] == "cannot_tell"
    assert sorted(question_ids(out)) == sorted([NOTHING_MORE, CPT_USED])
    got = items(out)
    if "cpt.full_time_days_used" in got:
        assert got["cpt.full_time_days_used"]["value"] is None


def test_cpt_days_sent_as_null_are_taken_as_not_entered(client):
    out = computed(client, with_changes(OPT_CARD, cpt_full_time_days=None))
    assert question_ids(out) == [CPT_USED]
    assert out["verdict"]["state"] == "cannot_tell"


def test_review_4_with_both_answers_the_verdict_is_decided_on_what_was_entered(client):
    asked = computed(client, NOTHING)
    given_answers = {NOTHING_MORE: True, CPT_USED: False}
    case = answer_as_the_screen_does(NOTHING, asked, "2026-09-28", **given_answers)
    out = computed(client, case)
    assert question_ids(out) == []
    assert out["verdict"] == {"state": "no_open_items", "reasons": []}
    assert items(out)["cpt.full_time_days_used"]["value"] == 0


# Finding 5


def test_each_question_in_the_response_carries_about(client):
    out = computed(client, NO_JOBS)
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert isinstance(question(out, NO_EMPLOYMENT)["about"], dict)


@pytest.mark.parametrize("on", [FAR_DAY, "2026-09-29"])
def test_review_5_an_answer_dated_after_today_is_refused_in_plain_words(client, on):
    case = with_changes(NO_JOBS, confirmations=answers(on, **{NO_EMPLOYMENT: True}))
    assert case_problems(case) == []
    response = client.post(URL, json=case)
    refused_in_plain_words(response)
    # The refusal carries nothing the person sent.
    assert on not in response.text


def test_nothing_from_a_refused_answer_is_logged(client, caplog, capsys):
    case = with_changes(NO_JOBS, confirmations=answers(FAR_DAY, **{NO_EMPLOYMENT: True}))
    with caplog.at_level(logging.DEBUG):
        assert client.post(URL, json=case).status_code == 422
    written = capsys.readouterr()
    lines = [record.getMessage() for record in caplog.records]
    lines += [str(record.args) for record in caplog.records if record.args]
    assert FAR_DAY not in "\n".join([*lines, written.out, written.err])


def test_an_answer_dated_tomorrow_in_utc_is_today_for_a_person_further_east(client):
    # The instant is 2026-09-28 18:00 UTC. In Pacific/Kiritimati, 14 hours ahead, it is
    # 08:00 on 2026-09-29, so an answer dated 2026-09-29 is dated today.
    case = with_changes(
        NO_JOBS,
        time_zone="Pacific/Kiritimati",
        confirmations=answers("2026-09-29", **{NO_EMPLOYMENT: True}),
    )
    assert client.post(URL, json=case).status_code == 200


@pytest.mark.parametrize("on", ["2026-07-11", "1950-01-01"])
def test_review_5_an_answer_given_before_today_leaves_the_question_open(client, on):
    asked = computed(client, NO_JOBS)
    case = answer_as_the_screen_does(NO_JOBS, asked, on, **{NO_EMPLOYMENT: True})
    out = computed(client, case)
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert items(out)["unemployment.days_used"]["value"] is None


def test_review_5_an_answer_about_another_start_date_leaves_the_question_open(client):
    asked = computed(client, NO_JOBS)
    # 12 months from 2026-07-01 is 2027-07-01, so the card ends 2027-06-30.
    moved = with_block(NO_JOBS, "opt", ead_start="2026-07-01", ead_end="2027-06-30")
    case = answer_as_the_screen_does(moved, asked, "2026-09-28", **{NO_EMPLOYMENT: True})
    out = computed(client, case)
    assert question_ids(out) == [NO_EMPLOYMENT]
    assert out["verdict"]["state"] == "cannot_tell"
    assert items(out)["unemployment.days_used"]["value"] is None


def test_review_5_an_answer_given_today_for_these_values_is_taken(client):
    asked = computed(client, NO_JOBS)
    case = answer_as_the_screen_does(NO_JOBS, asked, "2026-09-28", **{NO_EMPLOYMENT: True})
    out = computed(client, case)
    assert question_ids(out) == []
    # 2026-07-10 through 2026-09-28: 22 days of July, 31 of August, 28 of September.
    assert items(out)["unemployment.days_used"]["value"] == 81


# Finding 6


def test_review_6_a_filing_window_is_not_open_once_the_card_is_in_hand(client):
    out = computed(client, CARD_IN_HAND)
    done = {
        "opt.apply_window_opens",
        "opt.apply_window_closes",
        "opt.file_by",
        "opt.latest_start",
    }
    assert done.isdisjoint(out["verdict"]["reasons"])
    assert done.isdisjoint(upcoming(out))
    assert out["verdict"]["state"] != "needs_you"
