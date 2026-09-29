"""POST /v1/compute/f1: the answers to the phase 2 review.

Specified in specs/phase-2/SPEC-fixes.md, findings 1, 2, 4 and 7. The inputs the
reviewer used are in reviews/phase-2.md and appear here as written there.

The api loads the shipped f1 pack, whose values belong to L-content. So these tests never
assert a rule value.
"""

import asyncio
import json
import time
from datetime import UTC, date, datetime
from typing import Any

import pytest

from api.main import app, get_clock, get_f1_pack, get_settings
from api.settings import Settings
from engine.clocks import FixedClock
from tests.support.api_client import CheckedClient, as_the_screen_sends
from tests.support.f1_pack import (
    TIME_ZONE,
    answered_yes,
    cap_gap,
    case_problems,
    contract_problems,
    ead,
    items,
    job,
    question,
    with_block,
    with_changes,
)

URL = "/v1/compute/f1"
UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"
NOON = datetime(2026, 9, 28, 12, 0, tzinfo=UTC)
JSON = {"content-type": "application/json"}

GOOD: dict[str, Any] = {
    "program_end_date": "2026-05-17",
    "time_zone": TIME_ZONE,
    "degree_level": "doctorate",
    "documents_count": 7919,
    "cpt_full_time_days": 213,
    "opt": ead("2026-03-03", "2026-03-11", "2026-06-01", "2027-05-31"),
    "stem": None,
    "employment": [job("2026-06-01", None, hours=37.25)],
    "cap_gap": None,
}


class WatchingClock:
    """A fixed clock that notes, each time it is read, whether the thread that reads it
    is running an event loop."""

    def __init__(self, instant: datetime) -> None:
        self.inner = FixedClock(instant)
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
        return self.inner.now()

    def today(self) -> date:
        self._note()
        return self.inner.today()


@pytest.fixture
def client():
    app.dependency_overrides[get_clock] = lambda: FixedClock(NOON)
    # The database address leads nowhere. The route stores nothing, so it never notices.
    app.dependency_overrides[get_settings] = lambda: Settings(database_url=UNREACHABLE)
    yield CheckedClient(app)
    app.dependency_overrides.clear()


def refused_in_plain_words(response: Any) -> str:
    """The words of a 422. Never a computed answer, never a stack trace."""
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, str)
    assert detail.strip()
    assert "computed" not in response.text
    assert "Traceback" not in response.text
    return detail


# Finding 1: STEM without OPT


# reviews/phase-2.md, finding 1, the body as the reviewer sent it, and the time zone
# that the contract has required since.
REVIEWERS_BODY = (
    '{"time_zone":"UTC",'
    '"program_end_date":"2026-05-15","degree_level":"master","documents_count":2,'
    '"employment":[],"stem":{"dso_recommendation_date":"2026-04-01",'
    '"i765_filed_date":null,"ead_start":"2026-06-01","ead_end":"2028-05-31"}'
)


def test_the_reviewers_stem_without_opt_cannot_tell(client):
    # specs/phase-2/SPEC-context.md, section 4: Duly asks whether the person held OPT,
    # and cannot tell until the person answers.
    response = client.post(URL, content=(REVIEWERS_BODY + "}").encode(), headers=JSON)
    assert response.status_code == 200
    out = response.json()
    assert out["verdict"]["state"] == "cannot_tell"
    assert "unconfirmed:held_post_completion_opt" in out["verdict"]["reasons"]
    assert contract_problems(out) == []


def test_the_reviewers_stem_without_opt_with_the_answer_yes_names_opt(client):
    # The answer yes, given on 2026-09-28 with the about of the question the api asked:
    # an answer with no about is not an answer (SPEC-resolutions.md, point 7).
    asked = client.post(URL, content=(REVIEWERS_BODY + "}").encode(), headers=JSON).json()
    about = json.dumps(question(asked, "held_post_completion_opt")["about"])
    answer = (
        ',"confirmations":{"held_post_completion_opt":'
        f'{{"answer":true,"on":"2026-09-28","about":{about}}}}}}}'
    )
    response = client.post(URL, content=(REVIEWERS_BODY + answer).encode(), headers=JSON)
    assert response.status_code == 200
    out = response.json()
    assert out["verdict"]["state"] == "cannot_tell"
    assert any(r.startswith("missing:opt") for r in out["verdict"]["reasons"])
    assert contract_problems(out) == []


def test_cap_gap_with_neither_opt_nor_stem_cannot_tell(client):
    # The answer yes to each question this raises, given on the day of the case with the
    # about the api asked (SPEC-resolutions.md, points 2, 3 and 7).
    case = with_changes(
        GOOD, opt=None, employment=[], cap_gap=cap_gap("2026-10-01"), confirmations=answered_yes()
    )
    response = client.post(URL, json=as_the_screen_sends(client, URL, case, FixedClock(NOON)))
    assert response.status_code == 200
    out = response.json()
    assert out["verdict"]["state"] == "cannot_tell"
    assert any(r.startswith("missing:opt") for r in out["verdict"]["reasons"])


# Finding 2: numbers that are not numbers

TOKENS = ("NaN", "Infinity", "-Infinity")
MARK = '"MARK"'


def body_with(case: dict[str, Any], token: str) -> bytes:
    """The case as JSON text, with the bare token where the case holds MARK."""
    text = json.dumps(case)
    assert text.count(MARK) == 1
    return text.replace(MARK, token).encode()


PLACES: dict[str, dict[str, Any]] = {
    "hours_per_week": with_changes(GOOD, employment=[job("2026-06-01", None, hours="MARK")]),  # type: ignore[arg-type]
    "hours_in_the_third_period": with_changes(
        GOOD,
        employment=[
            job("2026-06-01", "2026-06-30"),
            job("2026-07-01", "2026-07-31"),
            job("2026-08-01", None, hours="MARK"),  # type: ignore[arg-type]
        ],
    ),
    "documents_count": with_changes(GOOD, documents_count="MARK"),
    "cpt_full_time_days": with_changes(GOOD, cpt_full_time_days="MARK"),
    "a_date": with_changes(GOOD, program_end_date="MARK"),
    "a_flag": with_changes(GOOD, cap_gap={**cap_gap("2026-10-01"), "change_of_status": "MARK"}),
    "a_field_the_contract_does_not_have": with_changes(GOOD, notes="MARK"),
    "a_list_in_a_field_the_contract_does_not_have": with_changes(GOOD, notes=[1, ["MARK"]]),
}


def test_the_reviewers_nan_hours_are_refused(client):
    # reviews/phase-2.md, finding 2: OPT from 2026-06-01, one open period from
    # 2026-06-01, and the body text "hours_per_week": NaN.
    body = body_with(PLACES["hours_per_week"], "NaN")
    assert b'"hours_per_week": NaN' in body
    refused_in_plain_words(client.post(URL, content=body, headers=JSON))


@pytest.mark.parametrize("token", TOKENS)
@pytest.mark.parametrize("place", PLACES)
def test_nan_and_infinity_are_refused_anywhere_in_the_body(client, place, token):
    response = client.post(URL, content=body_with(PLACES[place], token), headers=JSON)
    refused_in_plain_words(response)


@pytest.mark.parametrize("token", TOKENS)
def test_the_body_itself_cannot_be_nan_or_infinity(client, token):
    refused_in_plain_words(client.post(URL, content=token.encode(), headers=JSON))


@pytest.mark.parametrize("token", TOKENS)
def test_the_number_is_refused_before_the_case_is_checked(client, token):
    # The same token in the same place, in a case with no other problem and in a case
    # that also lacks a required field. The refusal is about the number both times.
    alone = client.post(URL, content=body_with(PLACES["hours_per_week"], token), headers=JSON)
    lacking = {k: v for k, v in PLACES["hours_per_week"].items() if k != "degree_level"}
    both = client.post(URL, content=body_with(lacking, token), headers=JSON)
    assert refused_in_plain_words(both) == refused_in_plain_words(alone)
    assert "degree_level" not in both.text


@pytest.mark.parametrize("number", ["1e999", "-1e999"])
@pytest.mark.parametrize("place", ["hours_per_week", "documents_count", "cpt_full_time_days"])
def test_a_number_too_large_to_be_finite_is_refused(client, place, number):
    response = client.post(URL, content=body_with(PLACES[place], number), headers=JSON)
    refused_in_plain_words(response)


def test_text_that_spells_nan_is_not_a_number_that_is_not_one(client):
    # The words are about the contract's list, as for any other unknown degree level.
    nan = client.post(URL, json=with_changes(GOOD, degree_level="NaN"))
    other = client.post(URL, json=with_changes(GOOD, degree_level="mark_q7f3kz"))
    assert refused_in_plain_words(nan) == refused_in_plain_words(other)


# Finding 4: bounded work

DATE_PLACES: dict[str, Any] = {
    "program_end_date": lambda d: with_changes(GOOD, program_end_date=d),
    "opt.dso_recommendation_date": lambda d: with_block(GOOD, "opt", dso_recommendation_date=d),
    "opt.i765_filed_date": lambda d: with_block(GOOD, "opt", i765_filed_date=d),
    "opt.ead_start": lambda d: with_block(GOOD, "opt", ead_start=d),
    "opt.ead_end": lambda d: with_block(GOOD, "opt", ead_end=d),
    "stem.dso_recommendation_date": lambda d: with_changes(
        GOOD, stem=ead(d, "2027-05-01", "2027-06-01", "2029-05-31")
    ),
    "stem.i765_filed_date": lambda d: with_changes(
        GOOD, stem=ead("2027-04-15", d, "2027-06-01", "2029-05-31")
    ),
    "stem.ead_start": lambda d: with_changes(
        GOOD, stem=ead("2027-04-15", "2027-05-01", d, "2029-05-31")
    ),
    "stem.ead_end": lambda d: with_changes(
        GOOD, stem=ead("2027-04-15", "2027-05-01", "2027-06-01", d)
    ),
    "employment.start": lambda d: with_changes(GOOD, employment=[job(d, None)]),
    "employment.end": lambda d: with_changes(GOOD, employment=[job("2026-06-01", d)]),
    "cap_gap.petition_filed_on": lambda d: with_changes(
        GOOD, cap_gap=cap_gap("2026-10-01", petition_filed_on=d)
    ),
    "cap_gap.requested_start": lambda d: with_changes(GOOD, cap_gap=cap_gap(d)),
}

# reviews/phase-2.md, finding 4, input B, then the first day on each side of the bounds.
FAR_DATES = ("9999-12-01", "0001-01-15", "0001-01-01", "9999-12-31", "1949-12-31", "2100-01-01")


@pytest.mark.parametrize("sent", FAR_DATES)
@pytest.mark.parametrize("place", DATE_PLACES)
def test_a_date_outside_1950_through_2099_is_refused_in_plain_words(client, place, sent):
    detail = refused_in_plain_words(client.post(URL, json=DATE_PLACES[place](sent)))
    # The words name the place and never carry what was sent.
    assert place.split(".")[-1] in detail
    assert sent not in detail


@pytest.mark.parametrize("program_end", ["1950-01-01", "2099-12-31"])
def test_a_program_end_on_the_first_or_last_day_allowed_is_answered(client, program_end):
    case = with_changes(GOOD, program_end_date=program_end, opt=None, employment=[])
    assert case_problems(case) == []
    response = client.post(URL, json=case)
    assert response.status_code == 200
    assert contract_problems(response.json()) == []


def test_the_reviewers_far_window_with_2000_periods_is_refused_at_once(client):
    # reviews/phase-2.md, finding 4, input A.
    case = with_changes(
        GOOD,
        opt=ead("2026-03-03", "2026-03-11", "0001-01-01", "9999-12-31"),
        employment=[job("2026-06-01", None) for _ in range(2000)],
    )
    started = time.perf_counter()
    response = client.post(URL, json=case)
    taken = time.perf_counter() - started
    refused_in_plain_words(response)
    assert taken < 1.0


def test_fifty_periods_are_answered_and_fifty_one_are_refused(client):
    periods = [job("2026-06-01", None) for _ in range(51)]
    assert client.post(URL, json=with_changes(GOOD, employment=periods[:50])).status_code == 200
    detail = refused_in_plain_words(client.post(URL, json=with_changes(GOOD, employment=periods)))
    assert "employment" in detail


@pytest.mark.parametrize(
    ("field", "most"), [("documents_count", 10000), ("cpt_full_time_days", 5000)]
)
def test_a_count_over_the_bound_is_refused(client, field, most):
    assert client.post(URL, json=with_changes(GOOD, **{field: most})).status_code == 200
    detail = refused_in_plain_words(client.post(URL, json=with_changes(GOOD, **{field: most + 1})))
    assert field in detail


def largest_case() -> dict[str, Any]:
    """The widest window and the most periods contracts/case_f1.schema.json allows."""
    return {
        "program_end_date": "1950-06-01",
        "time_zone": TIME_ZONE,
        "confirmations": answered_yes(),
        "degree_level": "doctorate",
        "documents_count": 10000,
        "cpt_full_time_days": 0,
        "opt": ead("1950-01-01", "1950-01-01", "1950-01-01", "2024-12-31"),
        "stem": ead("2024-12-31", "2024-12-31", "2025-01-01", "2099-12-31"),
        "employment": [job("1950-01-01", None, hours=number) for number in range(1, 51)],
        "cap_gap": cap_gap("2099-10-01", petition_filed_on="2099-04-01"),
    }


def test_the_largest_case_the_contract_allows_answers_in_under_one_second(client):
    clock = FixedClock(datetime(2099, 12, 31, 12, 0, tzinfo=UTC))
    app.dependency_overrides[get_clock] = lambda: clock
    assert case_problems(largest_case()) == []
    # Each answer is dated 2099-12-31, the day of the case, with the about the api asked
    # (SPEC-resolutions.md, points 2, 3 and 7). Only the request after this is timed.
    case = as_the_screen_sends(client, URL, largest_case(), clock)
    # The first request loads the pack. The time taken is that of a request after it.
    assert client.post(URL, json=GOOD).status_code == 200
    started = time.perf_counter()
    response = client.post(URL, json=case)
    taken = time.perf_counter() - started
    assert response.status_code == 200
    assert taken < 1.0
    assert contract_problems(response.json()) == []


def test_the_engine_does_not_run_on_the_event_loop(client):
    clock = WatchingClock(NOON)
    app.dependency_overrides[get_clock] = lambda: clock
    assert client.post(URL, json=GOOD).status_code == 200
    # The engine reads today from the injected clock, so it ran where the clock was read.
    assert clock.read_on_the_event_loop
    assert not any(clock.read_on_the_event_loop)


# Finding 7: the operative regime and its legal status


def test_every_item_with_alternates_carries_the_operative_regime_of_the_pack(client):
    operative = [r for r in get_f1_pack().regimes if r["operative"]]
    assert len(operative) == 1
    out = client.post(URL, json=GOOD).json()
    found = {i: item for i, item in items(out).items() if "alternates" in item}
    assert "grace.ends" in found
    for item_id, item in found.items():
        assert item["operative"] == {
            "regime": operative[0]["id"],
            "legal_status": operative[0]["legal_status"],
        }, item_id
        assert operative[0]["id"] not in [a["regime"] for a in item["alternates"]], item_id
    assert contract_problems(out) == []
