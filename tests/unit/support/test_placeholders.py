"""No placeholder answer reaches the engine or the api.

specs/product-1/SPEC-resolutions.md, points 2, 3 and 7: an answer is dated on or before
the day of the case, a yes to no_employment_to_record covers the days through its day,
and an answer is taken only with the about of the question it answers. The helpers of
tests/support/f1_pack.py write answers with two markers, ON_THE_DAY_IT_RUNS for the day
and about_asked(id) for the about, which dated_on_the_day and with_the_about_asked turn
into a real answer. A case that still holds a marker tests the marker and not the rule,
so refuse_placeholders raises on it, in every run helper and in CheckedClient.post.
"""

import ast
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from api.main import app, get_clock, get_settings
from api.settings import Settings
from engine import f1
from engine.clocks import FixedClock
from tests.support.api_client import CheckedClient, as_the_screen_sends
from tests.support.f1_pack import (
    NO_EMPLOYMENT,
    ON_THE_DAY_IT_RUNS,
    PlaceholderAnswerError,
    about_asked,
    answers,
    build_pack,
    clock_on,
    ead,
    no_earlier_opt,
    question,
    refuse_placeholders,
    with_changes,
    with_the_about_asked,
)

URL = "/v1/compute/f1"
UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"
REPO = Path(__file__).resolve().parents[3]
TESTS = (
    REPO / "tests" / "unit" / "engine",
    REPO / "tests" / "unit" / "api",
    REPO / "tests" / "holdout",
)

# 18:00 UTC on 2026-09-28 is 11:00 on 2026-09-28 in Los Angeles.
INSTANT = datetime(2026, 9, 28, 18, 0, tzinfo=UTC)

# OPT from 2026-07-10 and no employment: the engine asks no_employment_to_record.
NO_JOBS: dict[str, Any] = {
    "program_end_date": "2026-05-20",
    "degree_level": "master",
    "documents_count": 2,
    "cpt_full_time_days": 0,
    "opt": ead(None, None, "2026-07-10", "2027-07-09"),
    "employment": [],
    "time_zone": "America/Los_Angeles",
}


@pytest.fixture
def client():
    reads: list[datetime] = []

    def clock() -> FixedClock:
        reads.append(INSTANT)
        return FixedClock(INSTANT)

    app.dependency_overrides[get_clock] = clock
    app.dependency_overrides[get_settings] = lambda: Settings(database_url=UNREACHABLE)
    checked = CheckedClient(app)
    checked.reads = reads  # type: ignore[attr-defined]
    yield checked
    app.dependency_overrides.clear()


def engine_run(case: dict[str, Any]) -> dict[str, Any]:
    """A run helper as the test files write it: refuse_placeholders on what is parsed."""
    clock = clock_on(datetime(2026, 9, 28).date())
    parsed = f1.parse_case(refuse_placeholders(case), clock)
    return f1.compute_f1(parsed, build_pack(clock.now().date()), clock)


def test_a_case_dated_on_the_day_it_runs_is_refused():
    given = answers("2026-09-28", **{NO_EMPLOYMENT: True})
    given[NO_EMPLOYMENT]["about"] = {"opt.ead_start": "2026-07-10"}
    given[NO_EMPLOYMENT]["on"] = ON_THE_DAY_IT_RUNS
    with pytest.raises(PlaceholderAnswerError, match="ON_THE_DAY_IT_RUNS"):
        refuse_placeholders(with_changes(NO_JOBS, confirmations=given))


def test_a_case_whose_about_names_the_question_is_refused():
    given = answers("2026-09-28", **{NO_EMPLOYMENT: True})
    assert given[NO_EMPLOYMENT]["about"] == about_asked(NO_EMPLOYMENT)
    with pytest.raises(PlaceholderAnswerError, match="about"):
        refuse_placeholders(with_changes(NO_JOBS, confirmations=given))
    # Any about of the form {"question": id} is a marker, whatever the id.
    given[NO_EMPLOYMENT]["about"] = {"question": "another_question"}
    with pytest.raises(PlaceholderAnswerError):
        refuse_placeholders(with_changes(NO_JOBS, confirmations=given))


def test_the_refusal_is_not_the_refusal_the_engine_gives():
    # A test that expects the engine's ValueError (an answer dated after today) must not
    # pass on the marker instead.
    assert not issubclass(PlaceholderAnswerError, ValueError)


def test_a_case_with_no_answer_or_real_answers_passes_unchanged():
    assert refuse_placeholders(NO_JOBS) is NO_JOBS
    real = {NO_EMPLOYMENT: {"answer": True, "on": "2026-09-28", "about": {"x": "2026-07-10"}}}
    case = with_changes(NO_JOBS, confirmations=real)
    assert refuse_placeholders(case) is case


def test_the_about_step_answers_a_question_asked_with_no_about_with_none():
    # specs/path-1/programs.md section 13 and product-2 resolution 14: the path asks
    # complete.<kind> with no about. The answer goes with no about, and no marker.
    marker = about_asked("complete.work")
    given = {"complete.work": {"answer": True, "on": "2026-09-28", "about": marker}}
    asked = {"questions": [{"id": "complete.work", "because": ["unconfirmed:complete.work"]}]}
    sent = with_the_about_asked(with_changes(NO_JOBS, confirmations=given), lambda _: asked)
    assert sent["confirmations"] == {"complete.work": {"answer": True, "on": "2026-09-28"}}
    assert refuse_placeholders(sent) is sent


def test_a_run_helper_refuses_a_placeholder_before_the_engine_sees_it(monkeypatch):
    seen: list[Any] = []
    monkeypatch.setattr(f1, "parse_case", lambda *args: seen.append(args))
    case = with_changes(NO_JOBS, confirmations=answers(**{NO_EMPLOYMENT: True}))
    with pytest.raises(PlaceholderAnswerError):
        engine_run(case)
    assert seen == []


def test_the_checked_client_refuses_a_placeholder_before_it_is_posted(client):
    case = with_changes(NO_JOBS, confirmations=answers(**{NO_EMPLOYMENT: True}))
    with pytest.raises(PlaceholderAnswerError):
        client.post(URL, json=case)
    answer = {NO_EMPLOYMENT: {"answer": True, "on": ON_THE_DAY_IT_RUNS}}
    body = json.dumps(with_changes(NO_JOBS, confirmations=answer))
    with pytest.raises(PlaceholderAnswerError):
        client.post(URL, content=body.encode(), headers={"content-type": "application/json"})
    # The api was never called: it reads its clock on each request.
    assert client.reads == []


def test_the_checked_client_posts_a_body_that_is_not_json(client):
    response = client.post(URL, content=b"{", headers={"content-type": "application/json"})
    assert response.status_code == 422


def test_the_screen_step_gives_a_real_answer_that_is_taken(client):
    # SPEC-resolutions.md, point 39: opt.earlier_at_this_level is answered no beside it,
    # with a placeholder too, so both are made real by the screen step.
    placeholder = no_earlier_opt(
        with_changes(NO_JOBS, confirmations=answers(**{NO_EMPLOYMENT: True}))
    )
    sent = as_the_screen_sends(client, URL, placeholder, FixedClock(INSTANT))
    answer = sent["confirmations"][NO_EMPLOYMENT]
    # The person's own day in Los Angeles at 18:00 UTC on 2026-09-28 is 2026-09-28.
    assert answer["on"] == "2026-09-28"
    asked = client.post(URL, json=NO_JOBS).json()
    assert answer["about"] == question(asked, NO_EMPLOYMENT)["about"]
    out = client.post(URL, json=sent).json()
    assert out["questions"] == []
    # 2026-07-10 through 2026-09-28: 22 days of July, 31 of August, 28 of September.
    got = {item["id"]: item["value"] for item in out["computed"]}
    assert got["unemployment.days_used"] == 81


def helpers_that_parse_without_the_guard(path: Path) -> list[str]:
    """Each call to parse_case with a clock, in a run helper of the file, whose case is
    not passed through refuse_placeholders."""
    found = []
    for node in ast.walk(ast.parse(path.read_text())):
        if not isinstance(node, ast.FunctionDef) or node.name.startswith("test_"):
            continue
        for call in ast.walk(node):
            if not (
                isinstance(call, ast.Call)
                and isinstance(call.func, ast.Attribute)
                and call.func.attr == "parse_case"
                and len(call.args) == 2
            ):
                continue
            first = call.args[0]
            guarded = (
                isinstance(first, ast.Call)
                and isinstance(first.func, ast.Name)
                and first.func.id == "refuse_placeholders"
            )
            if not guarded:
                found.append(f"{path.name}:{call.lineno} in {node.name}")
    return found


def test_every_run_helper_passes_its_case_through_the_guard():
    files = sorted(p for folder in TESTS for p in folder.glob("test_*.py"))
    assert files
    unguarded = [line for path in files for line in helpers_that_parse_without_the_guard(path)]
    assert unguarded == []


def test_every_api_test_posts_through_the_checked_client():
    files = sorted(p for folder in TESTS for p in folder.glob("test_*.py"))
    plain = [
        f"{path.name}:{number}"
        for path in files
        for number, line in enumerate(path.read_text().splitlines(), start=1)
        if "TestClient(app" in line
    ]
    assert plain == []
