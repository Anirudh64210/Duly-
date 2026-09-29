"""POST /v1/compute/f1.

Specified in specs/phase-2/SPEC.md, "The api", and contracts/openapi.yaml:
  validate the body against contracts/case_f1.schema.json; on failure return 422 with the
  first problem in plain words. Load the f1 pack, call compute_f1 with the injected
  clock, return the result. The response must validate against
  contracts/engine_output.schema.json. Store nothing. Log nothing from the body.

The api loads the shipped f1 pack, whose values belong to L-content. So these tests never
assert a rule value. They check each answer against the rule the response itself shows.
The arithmetic is tested against the SPEC values in tests/unit/engine/test_f1.py.
"""

import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest

from api.main import app, get_clock, get_settings
from api.settings import Settings
from engine.clocks import FixedClock
from tests.support.api_client import CheckedClient, as_the_screen_sends
from tests.support.f1_pack import (
    NO_EMPLOYMENT,
    TIME_ZONE,
    answers,
    contract_problems,
    ead,
    items,
    job,
    with_block,
    with_changes,
)

URL = "/v1/compute/f1"
UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"
TODAY = date(2026, 9, 28)
CLOCK = FixedClock(datetime(2026, 9, 28, 12, 0, tzinfo=UTC))

# Values chosen so that each is easy to spot in a log: no other part of the stack
# produces these strings. GOOD raises no question (an open period from 2026-07-03 and
# the days before it inside the card), so it carries no answer: a placeholder answer
# never reaches the api (tests/support/api_client.py).
GOOD: dict[str, Any] = {
    "program_end_date": "2026-05-17",
    "time_zone": TIME_ZONE,
    "degree_level": "doctorate",
    "documents_count": 7919,
    "cpt_full_time_days": 213,
    "opt": ead("2026-03-03", "2026-03-11", "2026-06-02", "2027-06-01"),
    "stem": None,
    "employment": [job("2026-07-03", None, hours=37.25)],
    "cap_gap": None,
}
BODY_MARKS = (
    "2026-05-17",
    "doctorate",
    "7919",
    "2026-03-03",
    "2026-03-11",
    "2026-06-02",
    "2027-06-01",
    "2026-07-03",
    "37.25",
)
BAD_MARK = "mark_q7f3kz"


@pytest.fixture
def client():
    app.dependency_overrides[get_clock] = lambda: CLOCK
    # The database address leads nowhere. The route stores nothing, so it never notices.
    app.dependency_overrides[get_settings] = lambda: Settings(database_url=UNREACHABLE)
    yield CheckedClient(app)
    app.dependency_overrides.clear()


def day(text: str) -> date:
    return date.fromisoformat(text)


# A good case


def test_a_good_case_returns_the_engine_output(client):
    response = client.post(URL, json=GOOD)
    assert response.status_code == 200
    body = response.json()
    # specs/phase-2/SPEC-context.md, sections 2 and 4: the day used and the questions.
    assert set(body) == {
        "verdict",
        "scope",
        "computed",
        "rulepacks",
        "rules",
        "questions",
        "today",
        # specs/product-1/SPEC.md, section 3: the product output adds these two.
        "upcoming",
        "lists",
    }
    assert body["scope"]["documents_count"] == 7919
    assert [p["category"] for p in body["rulepacks"]] == ["f1"]
    got = items(body)
    for item_id in (
        "opt.apply_window_opens",
        "opt.apply_window_closes",
        "opt.file_by",
        "opt.latest_start",
        "opt.complete_by",
        "unemployment.limit",
        "unemployment.days_used",
        "unemployment.days_remaining",
        "employment.days_under_hours",
        "employment.periods_not_reported",
        "grace.ends",
        "cpt.full_time_days_used",
    ):
        assert item_id in got
    assert "capgap.ends" not in got
    assert "stem.file_by" not in got


def test_the_response_validates_against_the_output_contract(client):
    assert contract_problems(client.post(URL, json=GOOD).json()) == []


def test_a_case_with_only_the_required_fields_is_a_good_case(client):
    body = {
        "program_end_date": "2026-05-17",
        "time_zone": TIME_ZONE,
        "degree_level": "bachelor",
        "documents_count": 0,
        "employment": [],
    }
    response = client.post(URL, json=body)
    assert response.status_code == 200
    assert contract_problems(response.json()) == []
    # CLAUDE.md: a verdict never falls back to the quiet state. No documents, no verdict.
    assert response.json()["verdict"]["state"] == "cannot_tell"
    assert "no_documents" in response.json()["verdict"]["reasons"]


def test_a_full_case_validates_against_the_output_contract(client):
    full = with_changes(
        GOOD,
        program_end_date="2024-05-10",
        opt=ead("2024-03-01", "2024-03-15", "2024-07-01", "2025-06-30"),
        stem=ead("2025-04-15", "2025-05-01", "2025-07-01", "2027-06-30"),
        employment=[job("2024-07-01", None)],
        cap_gap={
            "petition_filed_on": "2026-04-02",
            "requested_start": "2026-10-01",
            "change_of_status": True,
            "status": "pending",
        },
    )
    response = client.post(URL, json=full)
    assert response.status_code == 200
    body = response.json()
    assert contract_problems(body) == []
    got = items(body)
    assert "stem.validation_4_due" in got
    assert "capgap.ends" in got


def test_each_answer_follows_from_the_rule_the_response_shows(client):
    body = client.post(URL, json=GOOD).json()
    got = items(body)
    rules = body["rules"]
    for item in got.values():
        assert item["rule_ids"]
        assert set(item["rule_ids"]) <= set(rules)
    program_end = day(GOOD["program_end_date"])
    after = timedelta(days=rules["opt.apply_after_days"]["value"])
    before = timedelta(days=rules["opt.apply_before_days"]["value"])
    within = timedelta(days=rules["opt.file_within_days_of_recommendation"]["value"])
    assert day(got["opt.apply_window_closes"]["value"]) == program_end + after
    # specs/phase-2/SPEC-fixes.md, "Finding 5": the start date has its own rule.
    latest = timedelta(days=rules["opt.latest_start_after_days"]["value"])
    assert day(got["opt.latest_start"]["value"]) == program_end + latest
    assert day(got["opt.apply_window_opens"]["value"]) == program_end - before
    assert day(got["opt.file_by"]["value"]) == day("2026-03-03") + within
    grace = timedelta(days=rules["grace.after_completion_days"]["value"])
    # final_end is the latest of 2026-05-17 and 2027-06-01.
    assert day(got["grace.ends"]["value"]) == day("2027-06-01") + grace
    assert (
        got["unemployment.days_remaining"]["value"]
        == got["unemployment.limit"]["value"] - got["unemployment.days_used"]["value"]
    )


def test_the_injected_clock_decides_today(client):
    # Window 2026-06-02 through the clock's today, 2026-09-28: 29 + 31 + 31 + 28 = 119
    # days. The one period runs from 2026-07-03 through today: 29 + 31 + 28 = 88 days.
    # Uncovered: Jun 2 through Jul 2, 29 + 2 = 31 days. No rule value is involved.
    got = items(client.post(URL, json=GOOD).json())
    assert got["unemployment.days_used"]["value"] == 31
    assert got["cpt.full_time_days_used"]["value"] == 213

    app.dependency_overrides[get_clock] = lambda: FixedClock(
        datetime(2026, 6, 11, 12, 0, tzinfo=UTC)
    )
    # Window 2026-06-02 through 2026-06-11: 10 days, none covered.
    earlier = items(client.post(URL, json=GOOD).json())
    assert earlier["unemployment.days_used"]["value"] == 10


def test_nothing_is_kept_between_requests(client):
    first = client.post(URL, json=GOOD).json()
    # No employment: the question no_employment_to_record is raised. The answer yes is
    # given on 2026-09-28, the day of the case, so it covers every day through it, with
    # the about the api asked (SPEC-resolutions.md, points 2, 3 and 7).
    idle = with_changes(
        GOOD, documents_count=1, employment=[], confirmations=answers(**{NO_EMPLOYMENT: True})
    )
    sent = as_the_screen_sends(client, URL, idle, CLOCK)
    assert sent["confirmations"][NO_EMPLOYMENT]["on"] == "2026-09-28"
    other = client.post(URL, json=sent).json()
    again = client.post(URL, json=GOOD).json()
    assert again == first
    assert other["scope"]["documents_count"] == 1
    assert other["questions"] == []
    # Window of 119 days with no employment: 2026-06-02 through 2026-09-28 is 29 days of
    # June, 31 of July, 31 of August and 28 of September.
    assert items(other)["unemployment.days_used"]["value"] == 119


def test_only_post_is_served(client):
    assert client.get(URL).status_code == 405


# A bad case


def without(case: dict[str, Any], field: str) -> dict[str, Any]:
    return {k: v for k, v in case.items() if k != field}


BAD_CASES: dict[str, Any] = {
    "empty_object": {},
    "no_program_end_date": without(GOOD, "program_end_date"),
    "no_degree_level": without(GOOD, "degree_level"),
    "no_documents_count": without(GOOD, "documents_count"),
    "no_employment": without(GOOD, "employment"),
    "no_time_zone": without(GOOD, "time_zone"),
    "unknown_field": with_changes(GOOD, notes=BAD_MARK),
    "unknown_degree_level": with_changes(GOOD, degree_level=BAD_MARK),
    "negative_documents_count": with_changes(GOOD, documents_count=-1),
    "documents_count_not_a_whole_number": with_changes(GOOD, documents_count=2.5),
    "negative_cpt_days": with_changes(GOOD, cpt_full_time_days=-1),
    "program_end_date_not_a_date": with_changes(GOOD, program_end_date=BAD_MARK),
    "program_end_date_not_on_the_calendar": with_changes(GOOD, program_end_date="2026-02-30"),
    "program_end_date_null": with_changes(GOOD, program_end_date=None),
    "opt_without_ead_end": with_changes(
        GOOD,
        opt={
            "dso_recommendation_date": "2026-03-03",
            "i765_filed_date": "2026-03-11",
            "ead_start": "2026-06-02",
        },
    ),
    "opt_with_unknown_field": with_block(GOOD, "opt", card_number=BAD_MARK),
    "employment_not_a_list": with_changes(GOOD, employment=job("2026-07-03", None)),
    "employment_hours_over_a_week": with_changes(
        GOOD, employment=[job("2026-07-03", None, hours=169)]
    ),
    "employment_hours_negative": with_changes(GOOD, employment=[job("2026-07-03", None, hours=-1)]),
    "employment_without_reported_flag": with_changes(
        GOOD, employment=[{"start": "2026-07-03", "end": None, "hours_per_week": 40}]
    ),
    "employment_start_null": with_changes(
        GOOD,
        employment=[{"start": None, "end": None, "hours_per_week": 40, "employer_reported": True}],
    ),
    "cap_gap_unknown_status": with_changes(
        GOOD,
        cap_gap={
            "petition_filed_on": "2026-04-02",
            "requested_start": "2026-10-01",
            "change_of_status": True,
            "status": BAD_MARK,
        },
    ),
    "body_is_a_list": [GOOD],
    "body_is_a_string": BAD_MARK,
}


@pytest.mark.parametrize("body", BAD_CASES.values(), ids=BAD_CASES.keys())
def test_a_bad_case_is_refused_with_422(client, body):
    response = client.post(URL, json=body)
    assert response.status_code == 422
    # The first problem, in words. Never a computed answer, never a stack trace.
    assert response.text.strip()
    assert "computed" not in response.text
    assert "Traceback" not in response.text


def test_a_body_that_is_not_json_is_refused_with_422(client):
    response = client.post(URL, content=b"{not json", headers={"content-type": "application/json"})
    assert response.status_code == 422


def test_a_bad_case_names_the_field_with_the_problem(client):
    response = client.post(URL, json=without(GOOD, "program_end_date"))
    assert response.status_code == 422
    assert "program_end_date" in response.text


def test_a_refusal_is_the_same_on_a_second_try(client):
    body = BAD_CASES["negative_documents_count"]
    assert client.post(URL, json=body).text == client.post(URL, json=body).text


# Nothing from the body is logged


def logged(caplog: pytest.LogCaptureFixture, capsys: pytest.CaptureFixture[str]) -> str:
    written = capsys.readouterr()
    lines = [record.getMessage() for record in caplog.records]
    lines += [str(record.args) for record in caplog.records if record.args]
    lines += [str(record.msg) for record in caplog.records]
    return "\n".join([*lines, written.out, written.err])


def test_nothing_from_a_good_body_is_logged(client, caplog, capsys):
    with caplog.at_level(logging.DEBUG):
        assert client.post(URL, json=GOOD).status_code == 200
    text = logged(caplog, capsys)
    for mark in BODY_MARKS:
        assert mark not in text


@pytest.mark.parametrize(
    "name",
    ["unknown_field", "unknown_degree_level", "opt_with_unknown_field", "body_is_a_string"],
)
def test_nothing_from_a_bad_body_is_logged(client, caplog, capsys, name):
    with caplog.at_level(logging.DEBUG):
        assert client.post(URL, json=BAD_CASES[name]).status_code == 422
    text = logged(caplog, capsys)
    assert BAD_MARK not in text
    for mark in BODY_MARKS:
        assert mark not in text
