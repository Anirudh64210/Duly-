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


def test_the_command_reads_the_record(tmp_path, capsys):
    events = tmp_path / "events.jsonl"
    events.write_text("\n".join(json.dumps(r) for r in ROWS) + "\n")
    assert efficiency.main([], events=events) == 0
    assert "stops: 1, 0.5 h" in capsys.readouterr().out
    assert efficiency.main([], events=tmp_path / "none.jsonl") == 0
