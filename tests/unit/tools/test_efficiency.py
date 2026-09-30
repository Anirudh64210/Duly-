"""The factory reports where its time went, from its own record."""

import json

from tools.factory import efficiency

ROWS = [
    {
        "at": "2026-09-29T12:00:00+00:00",
        "lane": "founder",
        "kind": "start",
        "message": "round tests: L-tests",
    },
    {
        "at": "2026-09-29T12:00:00+00:00",
        "lane": "L-tests",
        "kind": "start",
        "run_id": "l-tests-1",
        "message": "go",
    },
    {
        "at": "2026-09-29T12:30:00+00:00",
        "lane": "L-tests",
        "kind": "done",
        "run_id": "l-tests-1",
        "message": "done",
    },
    {
        "at": "2026-09-29T12:31:00+00:00",
        "lane": "founder",
        "kind": "step",
        "message": "pull request ready for round tests",
    },
    {
        "at": "2026-09-29T12:41:00+00:00",
        "lane": "founder",
        "kind": "step",
        "message": "clean CI for round tests: 2 checks",
    },
    {
        "at": "2026-09-29T12:42:00+00:00",
        "lane": "founder",
        "kind": "step",
        "message": "review: VETO, scores {}",
    },
    {
        "at": "2026-09-29T12:42:00+00:00",
        "lane": "founder",
        "kind": "blocked",
        "message": "round review stopped",
    },
    {
        "at": "2026-09-29T13:12:00+00:00",
        "lane": "founder",
        "kind": "start",
        "message": "round review: L-review",
    },
    {
        "at": "2026-09-29T13:12:00+00:00",
        "lane": "health",
        "kind": "start",
        "run_id": "health-1",
        "message": "x",
    },
    {
        "at": "2026-09-29T14:00:00+00:00",
        "lane": "founder",
        "kind": "step",
        "message": "review: APPROVE, scores {}",
    },
]


def test_the_report_counts_agents_ci_stops_and_reviews():
    out = efficiency.report(ROWS)
    assert round(out.wall_hours, 2) == 2.0
    assert out.agent_seconds == {"L-tests": 1800.0}  # health checks are left out
    assert (out.ci_waits, out.ci_seconds) == (1, 600.0)
    assert (out.stops, out.stop_seconds) == (1, 1800.0)
    assert (out.reviews, out.vetoes) == (2, 1)
    text = "\n".join(out.lines())
    assert "CI waits: 1, 0.2 h" in text
    assert "reviews: 2, vetoes: 1" in text


def test_a_window_narrows_the_report_and_an_empty_one_is_empty():
    assert efficiency.report(ROWS, since="2026-09-29T13:00").reviews == 1
    assert efficiency.report(ROWS, since="2027-01-01").wall_hours == 0.0


def run(plan: str, agent: str, start: str, end: str, **extra) -> dict:
    return {
        "task": f"{plan}/build/L-x",
        "agent": agent,
        "cost_usd": 1.5,
        "turns": 10,
        "started_at": f"2026-09-29T{start}:00+00:00",
        "ended_at": f"2026-09-29T{end}:00+00:00",
        **extra,
    }


RUNS = [
    run(
        "product-2",
        "builder",
        "12:00",
        "13:00",
        tokens={
            "input_tokens": 100,
            "cache_creation_input_tokens": 2_000_000,
            "cache_read_input_tokens": 1_000_000,
            "output_tokens": 50_000,
        },
    ),
    run("product-2", "reviewer", "13:00", "14:30", tokens_in=500_000, tokens_out=20),
    run("health", "builder", "12:10", "12:20", tokens_in=100, tokens_out=1),
]
REVIEWS = [
    {"at": "2026-09-29T14:30:00+00:00", "task": "product-2/review/L-review", "decision": "VETO"},
    {
        "at": "2026-09-29T15:00:00+00:00",
        "plan": "ui-1",
        "task": "product-2/r/L",
        "decision": "VETO",
    },
]


def at(minute: int) -> str:
    return f"2026-09-29T15:{minute:02d}:00+00:00"


def founder(minute: int, kind: str, message: str, **extra) -> dict:
    return {"at": at(minute), "lane": "founder", "kind": kind, "message": message, **extra}


def agent_stop(minute: int, cause: str) -> dict:
    return {"at": at(minute), "lane": "L-x", "kind": "blocked", "plan": "product-2", "cause": cause}


STOPS = [
    # The founder named the cause of this stop; it wins over the agent's.
    founder(1, "start", "round r1: L-x"),
    agent_stop(2, "spec"),
    founder(3, "blocked", "round r1 stopped", plan="product-2", cause="unknown", hash="a"),
    # No one named one, so the agent's own stop in the round gives it; the agent's stop is
    # not counted again.
    founder(4, "start", "round r2: L-x"),
    agent_stop(5, "spec"),
    founder(6, "blocked", "round r2 stopped", plan="product-2", cause="unknown"),
    # Work held for the founder's approval is not a stop.
    founder(7, "start", "round r3: L-x"),
    founder(8, "held", "L-x: 2 files on lane/x, waiting for the founder", plan="product-2"),
    agent_stop(9, "unknown"),
    founder(10, "blocked", "round r3 stopped", plan="product-2", cause="infra"),
    founder(11, "start", "round r4: L-x"),
    founder(12, "blocked", "round r4 stopped", plan="product-2", cause="luck"),
    founder(13, "blocked", "an old stop, no plan"),
    {"at": at(20), "kind": "control", "handles": "a", "cause": "code"},
]


def test_each_plan_reports_dollars_tokens_runs_turns_vetoes_stops_and_hours():
    found = efficiency.plans(RUNS, REVIEWS, STOPS)
    p2 = found["product-2"]
    assert (p2.dollars, p2.runs, p2.turns, p2.reviews, p2.vetoes) == (3.0, 2, 20, 1, 1)
    assert p2.wall_hours == 2.5  # first run's start to last run's end
    assert p2.tokens_by_class == {
        "input": 100,
        "cache write": 2_000_000,
        "cache read": 1_000_000,
        "output": 50_000,
        "input and cache": 500_000,
        "output, streamed": 20,
    }
    assert p2.tokens_by_role == {"builder": 3_050_100, "reviewer": 500_020}
    # A strange cause is unknown, and the stop with no plan is not filed under any.
    assert p2.stops == {"code": 1, "spec": 1, "infra": 1, "unknown": 1}
    assert found["ui-1"].vetoes == 1  # a review is filed under its own plan
    assert found["health"].runs == 1
    text = "\n".join(p2.lines("product-2"))
    assert "plan product-2: $3.00 list, 2 runs, 20 turns, 2.5 wall h" in text
    assert "tokens by role: builder 3.05 M, reviewer 0.50 M" in text
    assert "stops: 4 (code 1, infra 1, spec 1, unknown 1)" in text
    assert "FLAG: 1 stops have no cause" in text
    assert "FLAG" not in "\n".join(found["health"].lines("health"))


def test_a_window_narrows_each_plan():
    found = efficiency.plans(RUNS, REVIEWS, STOPS, since="2026-09-29T12:30")
    assert found["product-2"].runs == 1
    assert "health" not in found


def test_the_command_reads_the_record(tmp_path, capsys):
    rows = {"events": ROWS + STOPS, "metrics": RUNS, "reviews": REVIEWS}
    for name, lines in rows.items():
        (tmp_path / f"{name}.jsonl").write_text("\n".join(json.dumps(r) for r in lines) + "\n")
    assert efficiency.main([], state=tmp_path) == 0
    out = capsys.readouterr().out
    # The founder lane's stop rows only: agents' stops and held work are not counted.
    assert "stops: 6, 0.6 h" in out
    assert "weekly-meter change: not measured" in out  # it has no API, so it is not guessed
    assert out.index("plan product-2") < out.index("plan health") < out.index("plan ui-1")
    assert efficiency.main([], state=tmp_path / "none") == 0
