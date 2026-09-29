"""POST /v1/compute/f1 after the context round.

Specified in specs/phase-2/SPEC-context.md, sections 2, 4 and 5, and the contracts:
  the case carries time_zone, and may carry confirmations. An unknown zone is refused
  with a 422 in plain words. The response carries today and questions, and each rule
  carries its derivation.

The api loads the shipped f1 pack, whose values and words belong to L-content. These
tests assert no rule value. The arithmetic is tested against the SPEC values in
tests/unit/engine/test_f1_context.py.
"""

import logging
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

from api.main import app, get_clock, get_settings
from api.settings import Settings
from engine.clocks import FixedClock
from tests.support.api_client import CheckedClient, as_the_screen_sends
from tests.support.f1_pack import (
    CAP_GAP_ALONE,
    HELD_OPT,
    NO_EMPLOYMENT,
    answers,
    cap_gap,
    contract_problems,
    ead,
    items,
    job,
    no_earlier_opt,
    periods_answered,
    question_ids,
    with_changes,
)

URL = "/v1/compute/f1"
UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"

# SPEC-context, section 2, "Test": 01:30 UTC on 2026-09-29.
EARLY = datetime(2026, 9, 29, 1, 30, tzinfo=UTC)

# OPT from 2026-06-01, one period through 2026-08-31.
GOOD: dict[str, Any] = {
    "program_end_date": "2026-05-17",
    "degree_level": "doctorate",
    "documents_count": 7919,
    "cpt_full_time_days": 213,
    "opt": ead("2026-03-03", "2026-03-11", "2026-06-01", "2027-05-31"),
    "stem": None,
    "employment": [job("2026-06-01", "2026-08-31", hours=37.25)],
    "cap_gap": None,
    "time_zone": "America/Los_Angeles",
}

# SPEC-resolutions.md, point 20: the period begins on the STEM card; it is not with a new
# employer (periods_answered). The tests here are about held_post_completion_opt.
STEM_ONLY: dict[str, Any] = periods_answered(
    {
        "program_end_date": "2026-05-15",
        "degree_level": "master",
        "documents_count": 2,
        "cpt_full_time_days": 0,
        "employment": [job("2026-06-01", None)],
        "stem": ead("2026-04-01", "2026-04-20", "2026-06-01", "2028-05-31"),
        "time_zone": "Asia/Kolkata",
    }
)

CAP_GAP_ONLY: dict[str, Any] = {
    "program_end_date": "2026-12-18",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "employment": [],
    "cap_gap": cap_gap("2026-10-01"),
    "time_zone": "America/New_York",
}

# A zone that matches the pattern of the contract and does not exist. The name is easy
# to spot in a log or in a refusal.
NO_SUCH_ZONE = "Mars/Olympus_Mons"

# Statuses whose rules carry a derivation. SPEC-context, section 1.
DERIVED = ("settled", "guidance", "litigated", "proposed")


@pytest.fixture
def client():
    app.dependency_overrides[get_clock] = lambda: FixedClock(EARLY)
    # The database address leads nowhere. The route stores nothing, so it never notices.
    app.dependency_overrides[get_settings] = lambda: Settings(database_url=UNREACHABLE)
    yield CheckedClient(app)
    app.dependency_overrides.clear()


def computed(client: TestClient, case: dict[str, Any]) -> dict[str, Any]:
    """The output for the case as the screen sends it: each answer made with answers()
    is dated on the person's own day at EARLY and carries the about the api asked
    (SPEC-resolutions.md, points 2, 3 and 7)."""
    sent = as_the_screen_sends(client, URL, case, FixedClock(EARLY))
    response = client.post(URL, json=sent)
    assert response.status_code == 200, response.text
    out: dict[str, Any] = response.json()
    assert contract_problems(out) == []
    return out


def with_answers(case: dict[str, Any], given: dict[str, Any]) -> dict[str, Any]:
    """The case with the answers given added to those it holds (periods_answered)."""
    return with_changes(case, confirmations={**case.get("confirmations", {}), **given})


def refused_in_plain_words(response: Any) -> str:
    """The words of a 422. Never a computed answer, never a stack trace."""
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, str)
    assert detail.strip()
    assert "computed" not in response.text
    assert "Traceback" not in response.text
    return detail


def unconfirmed(out: dict[str, Any]) -> list[str]:
    return [
        r.removeprefix("unconfirmed:")
        for r in out["verdict"]["reasons"]
        if r.startswith("unconfirmed:")
    ]


# Section 2: the person's own day


def test_the_same_instant_is_the_28th_in_los_angeles_and_the_29th_in_kolkata(client):
    west = computed(client, with_changes(GOOD, time_zone="America/Los_Angeles"))
    east = computed(client, with_changes(GOOD, time_zone="Asia/Kolkata"))
    assert west["today"] == {"date": "2026-09-28", "time_zone": "America/Los_Angeles"}
    assert east["today"] == {"date": "2026-09-29", "time_zone": "Asia/Kolkata"}
    # Every day from 2026-09-01 on is without an employer: 28 days, and 29.
    assert items(west)["unemployment.days_used"]["value"] == 28
    assert items(east)["unemployment.days_used"]["value"] == 29


@pytest.mark.parametrize(
    ("zone", "expected"),
    [
        ("UTC", "2026-09-29"),
        ("America/New_York", "2026-09-28"),
        ("America/Argentina/Buenos_Aires", "2026-09-28"),
        ("Europe/London", "2026-09-29"),
        ("Pacific/Kiritimati", "2026-09-29"),
    ],
)
def test_the_response_carries_the_day_used_and_the_zone(client, zone, expected):
    out = computed(client, with_changes(GOOD, time_zone=zone))
    assert out["today"] == {"date": expected, "time_zone": zone}


def test_a_case_without_a_time_zone_is_refused(client):
    case = {name: entered for name, entered in GOOD.items() if name != "time_zone"}
    detail = refused_in_plain_words(client.post(URL, json=case))
    assert "time_zone" in detail


@pytest.mark.parametrize(
    "zone",
    [NO_SUCH_ZONE, "America/Los_Angelos", "Europe/Atlantis", "Etc/GMT+15"],
)
def test_a_zone_that_does_not_exist_is_refused_in_plain_words(client, zone):
    response = client.post(URL, json=with_changes(GOOD, time_zone=zone))
    detail = refused_in_plain_words(response)
    # The words name the place of the problem and never carry the value that was sent.
    assert "time_zone" in detail
    assert zone not in response.text


NOT_ZONES: dict[str, Any] = {
    "empty": "",
    "null": None,
    "number": 330,
    "offset": "+05:30",
    "abbreviation": "PST",
    "words": "Los Angeles",
    "path": "../../etc/passwd",
    "leading_slash": "/America/Los_Angeles",
    "four_parts": "America/Argentina/Buenos_Aires/Centro",
    "too_long": "America/" + "A" * 60,
    "list": ["America/Los_Angeles"],
}


@pytest.mark.parametrize("zone", NOT_ZONES.values(), ids=NOT_ZONES.keys())
def test_a_time_zone_that_is_not_an_iana_name_is_refused(client, zone):
    response = client.post(URL, json=with_changes(GOOD, time_zone=zone))
    refused_in_plain_words(response)
    if isinstance(zone, str) and zone:
        assert zone not in response.text


def test_the_refusal_of_a_zone_is_the_same_on_a_second_try(client):
    body = with_changes(GOOD, time_zone=NO_SUCH_ZONE)
    assert client.post(URL, json=body).text == client.post(URL, json=body).text


def test_nothing_from_a_refused_zone_is_logged(client, caplog, capsys):
    with caplog.at_level(logging.DEBUG):
        response = client.post(URL, json=with_changes(GOOD, time_zone=NO_SUCH_ZONE))
        assert response.status_code == 422
    written = capsys.readouterr()
    lines = [record.getMessage() for record in caplog.records]
    lines += [str(record.args) for record in caplog.records if record.args]
    text = "\n".join([*lines, written.out, written.err])
    assert NO_SUCH_ZONE not in text
    assert "7919" not in text


def test_a_good_case_after_a_refused_zone_is_answered(client):
    assert client.post(URL, json=with_changes(GOOD, time_zone=NO_SUCH_ZONE)).status_code == 422
    assert computed(client, GOOD)["today"]["date"] == "2026-09-28"


# Section 4: confirm, never assume


def test_a_case_with_no_gap_carries_an_empty_list_of_questions(client):
    # SPEC-resolutions.md, point 22: the end of GOOD's period, 2026-08-31, was reported
    # (periods_answered). The test is about the questions of SPEC-context, section 4.
    out = computed(client, periods_answered(GOOD))
    assert out["questions"] == []
    assert unconfirmed(out) == []


@pytest.mark.parametrize(
    ("case", "question"),
    [
        (STEM_ONLY, HELD_OPT),
        (CAP_GAP_ONLY, CAP_GAP_ALONE),
        # SPEC-resolutions.md, point 39: opt.earlier_at_this_level answered no, so the
        # question under test stands alone (no_earlier_opt).
        (no_earlier_opt(with_changes(GOOD, employment=[])), NO_EMPLOYMENT),
    ],
    ids=[HELD_OPT, CAP_GAP_ALONE, NO_EMPLOYMENT],
)
def test_a_gap_is_asked_about_and_the_verdict_waits(client, case, question):
    out = computed(client, case)
    assert question_ids(out) == [question]
    assert out["verdict"]["state"] == "cannot_tell"
    assert unconfirmed(out) == [question]
    assert out["questions"][0]["because"]


@pytest.mark.parametrize(
    ("case", "question", "missing"),
    [
        (STEM_ONLY, HELD_OPT, "missing:opt.ead_end"),
        (CAP_GAP_ONLY, CAP_GAP_ALONE, "missing:opt.ead_end"),
    ],
    ids=[HELD_OPT, CAP_GAP_ALONE],
)
def test_the_answer_yes_names_what_is_missing(client, case, question, missing):
    out = computed(client, with_answers(case, answers(**{question: True})))
    assert out["questions"] == []
    assert out["verdict"]["state"] == "cannot_tell"
    assert missing in out["verdict"]["reasons"]


@pytest.mark.parametrize(
    ("case", "question", "judgement"),
    [
        (STEM_ONLY, HELD_OPT, "stem_without_post_completion_opt"),
        (CAP_GAP_ONLY, CAP_GAP_ALONE, "cap_gap_without_training"),
    ],
    ids=[HELD_OPT, CAP_GAP_ALONE],
)
def test_the_answer_no_is_for_the_dso(client, case, question, judgement):
    out = computed(client, with_answers(case, answers(**{question: False})))
    assert out["questions"] == []
    assert out["verdict"]["state"] == "talk_to_dso"
    assert judgement in out["verdict"]["reasons"]


def test_the_answer_no_about_opt_shows_the_paragraph_on_who_may_apply(client):
    case = with_answers(STEM_ONLY, answers(held_post_completion_opt=False))
    shown = computed(client, case)["rules"]["stem.requires_post_completion_opt"]
    assert shown["quote"].strip()
    assert shown["citation"].strip()
    assert shown["derivation"] in ("verbatim", "reading")


def test_no_employment_answered_yes_is_counted_and_answered_no_is_missing(client):
    # Point 39: opt.earlier_at_this_level answered no beside the answer under test.
    empty = no_earlier_opt(with_changes(GOOD, employment=[]))
    yes = computed(client, with_answers(empty, answers(**{NO_EMPLOYMENT: True})))
    # OPT from 2026-06-01 through 2026-09-28 in Los Angeles: 30 + 31 + 31 + 28.
    assert items(yes)["unemployment.days_used"]["value"] == 120
    assert yes["questions"] == []
    no = computed(client, with_answers(empty, answers(**{NO_EMPLOYMENT: False})))
    assert no["verdict"]["state"] == "cannot_tell"
    assert "missing:employment" in no["verdict"]["reasons"]


BAD_ANSWERS: dict[str, Any] = {
    "a_list": [],
    "text": "yes",
    "answer_as_text": {HELD_OPT: {"answer": "yes", "on": "2026-09-28"}},
    "answer_as_a_number": {HELD_OPT: {"answer": 1, "on": "2026-09-28"}},
    "answer_null": {HELD_OPT: {"answer": None, "on": "2026-09-28"}},
    "answer_alone": {HELD_OPT: True},
    "no_answer": {HELD_OPT: {"on": "2026-09-28"}},
    "no_day": {HELD_OPT: {"answer": True}},
    "day_null": {HELD_OPT: {"answer": True, "on": None}},
    "day_not_on_the_calendar": {HELD_OPT: {"answer": True, "on": "2026-02-30"}},
    "day_with_a_time": {HELD_OPT: {"answer": True, "on": "2026-09-28T01:30:00Z"}},
    "day_too_early": {HELD_OPT: {"answer": True, "on": "1949-12-31"}},
    "day_too_late": {HELD_OPT: {"answer": True, "on": "2100-01-01"}},
    "unknown_field": {HELD_OPT: {"answer": True, "on": "2026-09-28", "by": "mark_q7f3kz"}},
    "id_in_capitals": {"HELD_POST_COMPLETION_OPT": {"answer": True, "on": "2026-09-28"}},
    "id_with_a_space": {"held opt": {"answer": True, "on": "2026-09-28"}},
    # SPEC-resolutions.md, point 38: the contract bounds confirmations at 256, so a test of
    # a refused count sends one more, 257 (range(257) is 0 to 256, which is 257 ids).
    "too_many": {f"question_{n}": {"answer": True, "on": "2026-09-28"} for n in range(257)},
}


@pytest.mark.parametrize("sent", BAD_ANSWERS.values(), ids=BAD_ANSWERS.keys())
def test_confirmations_that_do_not_match_the_contract_are_refused(client, sent):
    response = client.post(URL, json=with_changes(STEM_ONLY, confirmations=sent))
    refused_in_plain_words(response)
    assert "mark_q7f3kz" not in response.text


def test_nothing_is_kept_between_requests_not_even_an_answer(client):
    answered = with_answers(STEM_ONLY, answers(held_post_completion_opt=True))
    assert computed(client, answered)["questions"] == []
    # The same person, asked again without the answer, is asked the question again.
    assert question_ids(computed(client, STEM_ONLY)) == [HELD_OPT]


# Section 5: rules shown with their derivation


@pytest.mark.parametrize("case", [GOOD, STEM_ONLY], ids=["opt", "stem"])
def test_every_rule_in_the_response_carries_its_derivation(client, case):
    out = computed(client, case)
    assert out["rules"]
    for rule_id, shown in out["rules"].items():
        if shown["status"] not in DERIVED:
            continue
        assert shown["derivation"] in ("verbatim", "reading"), rule_id
        if shown["derivation"] == "reading":
            # A reading is shown as a reading: the quoted words, then the note.
            assert shown["note"].strip(), rule_id
            assert shown["quote"].strip(), rule_id
            assert shown["note"] != shown["quote"], rule_id
