import json
from datetime import UTC, datetime

from dashboard import factory_data as data

T0 = "2026-09-29T06:00:00+00:00"


def ev(lane, kind, message, at=T0, agent="builder"):
    return {"at": at, "lane": lane, "agent": agent, "kind": kind, "message": message}


def test_latest_run_of_each_lane_is_tracked():
    agents = data.agents_from_events(
        [
            ev("L-web", "start", "old mission"),
            ev("L-web", "done", "done: x"),
            ev("L-web", "start", "new mission", at="2026-09-29T07:00:00+00:00"),
            ev("L-web", "step", "iteration 2 of 5"),
            ev("L-web", "step", "writes web/src/App.tsx"),
            ev("L-web", "test", "runs npm test"),
            ev("L-web", "step", "iteration ended after 9 turns"),
        ]
    )
    web = agents["L-web"]
    assert web.mission == "new mission"
    assert web.runs == 2
    assert web.state == "working"
    assert web.iteration == "2/5"
    assert (web.actions, web.tests_run) == (2, 1)
    assert web.last_action == "runs npm test"


def test_orchestrator_is_not_an_agent():
    assert data.agents_from_events([ev("founder", "start", "round A")]) == {}


def test_end_states_are_kept():
    for kind in ("done", "failed", "blocked"):
        agents = data.agents_from_events([ev("L-api", "start", "m"), ev("L-api", kind, "why")])
        assert agents["L-api"].state == kind
        assert agents["L-api"].ended_at == datetime(2026, 9, 29, 6, 0, tzinfo=UTC)


def test_running_lanes_come_from_the_process_list():
    ps = "python -m tools.factory.run_lane --lane L-tests --agent a\nvim\n"
    assert data.running_lanes(ps) == {"L-tests"}


def test_lessons_are_counted_by_heading():
    text = "# Progress\n\n## Lesson\nx\n\n### lesson 2\ny\n\nA lesson in a sentence.\n"
    assert data.count_lessons(text) == 2


def test_transcript_reads_every_kind_of_line_and_counts_tokens_once(tmp_path):
    usage = {
        "input_tokens": 2,
        "cache_read_input_tokens": 100,
        "cache_creation_input_tokens": 10,
        "output_tokens": 7,
    }
    rows = [
        {"type": "user", "timestamp": T0, "message": {"content": "the mission"}},
        {
            "type": "assistant",
            "timestamp": T0,
            "requestId": "r1",
            "message": {
                "usage": usage,
                "content": [{"type": "text", "text": "I will read the spec."}],
            },
        },
        {
            "type": "assistant",
            "timestamp": T0,
            "requestId": "r1",
            "message": {
                "usage": usage,
                "content": [{"type": "tool_use", "name": "Bash", "input": {"command": "ls"}}],
            },
        },
        {
            "type": "user",
            "timestamp": T0,
            "message": {
                "content": [
                    {"type": "tool_result", "content": [{"type": "text", "text": "x" * 50}]}
                ]
            },
        },
        {
            "type": "user",
            "timestamp": T0,
            "message": {
                "content": [{"type": "tool_result", "is_error": True, "content": "blocked"}]
            },
        },
        {
            "type": "assistant",
            "timestamp": T0,
            "requestId": "r2",
            "message": {
                "usage": usage,
                "content": [{"type": "tool_use", "name": "Read", "input": {"file_path": "a.py"}}],
            },
        },
        {"type": "attachment"},
    ]
    path = tmp_path / "s.jsonl"
    path.write_text("\n".join(json.dumps(r) for r in rows) + "\nnot json\n")
    lines, tokens_in, tokens_out = data.transcript([path], result_chars=20)
    assert [line.kind for line in lines] == ["prompt", "say", "tool", "result", "error", "tool"]
    assert lines[2].text == "$ ls"
    assert lines[3].text.endswith("30 more characters")
    assert lines[5].text == "Read a.py"
    assert (tokens_in, tokens_out) == (224, 14)


def test_session_folder_matches_the_worktree_path(tmp_path):
    folder = data.session_dir(tmp_path / "duly-L.web")
    assert folder.name.endswith("duly-L-web")
    assert "/" not in folder.name
    assert data.session_files(tmp_path / "nowhere") == []


def test_load_reads_a_repo_without_any_agents(tmp_path):
    snap = data.load(tmp_path)
    assert snap.agents == []
    assert snap.round_line == ""


def test_load_reads_events_gates_and_lessons(tmp_path):
    repo = tmp_path / "duly"
    (repo / ".factory").mkdir(parents=True)
    (repo / ".claude" / "LESSONS" / "proposals").mkdir(parents=True)
    (repo / ".claude" / "LESSONS" / "proposals" / "a.md").write_text("x")
    (repo / ".claude" / "skills" / "s1").mkdir(parents=True)
    (repo / ".claude" / "skills" / "s1" / "SKILL.md").write_text("x")
    (repo / ".claude" / "skills" / "s1" / "REPLAY.md").write_text("x")
    events = [
        ev("founder", "start", "round A: L-api"),
        ev("L-api", "start", "m"),
        ev("L-api", "step", "reads api/main.py"),
    ]
    (repo / ".factory" / "events.jsonl").write_text(
        "\n".join(json.dumps(e) for e in events) + "\nbroken\n"
    )
    (repo / ".factory" / "gates.json").write_text(json.dumps({"results": {"types": "pass"}}))
    tree = tmp_path / "duly-L-api"
    (tree / "api").mkdir(parents=True)
    (tree / "api" / "PROGRESS.md").write_text("# Log\n\n## Lesson\nfailure, fix, evidence\n")

    snap = data.load(repo, with_tokens=False)
    api = snap.agents[0]
    assert snap.round_line == "round A: L-api"
    assert snap.gates == {"types": "pass"}
    assert (snap.proposals, snap.skills, snap.skills_replayed) == (1, 1, 1)
    assert api.state == "stopped"  # it says working, but no process is running
    assert api.lessons == 1
    assert api.worktree == tree
    assert "Not yet committed" in data.changes(repo, api)


def test_changes_without_a_worktree():
    assert "No worktree" in data.changes(data.CLAUDE_PROJECTS, data.Agent(lane="L-x"))


def test_spans_and_counts_read_well():
    start = datetime(2026, 9, 29, 6, 0, tzinfo=UTC)
    assert data.span(start, datetime(2026, 9, 29, 6, 8, 5, tzinfo=UTC)) == "8m 05s"
    assert data.span(start, datetime(2026, 9, 29, 8, 3, tzinfo=UTC)) == "2h 03m"
    assert data.span(None, start) == ""
    assert [data.short_count(n) for n in (12, 4_200, 2_600_000)] == ["12", "4k", "2.6M"]
    assert data.parse_time("never") is None
