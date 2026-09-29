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

    snap = data.load(repo, with_tokens=False, ps_output="")
    api = snap.agents[0]
    assert snap.round_line == "round A: L-api"
    assert snap.gates == {"types": "pass"}
    assert (snap.proposals, snap.skills, snap.skills_replayed) == (1, 1, 1)
    assert api.state == "stopped"  # it says working, but no process is running
    assert api.lessons == 1
    assert api.worktree == tree
    assert "Not yet committed" in data.changes(repo, api)

    main = data.snapshot_json(repo, ps_output="")
    assert json.loads(json.dumps(main)) == main  # plain values only
    assert main["totals"]["running"] == 0
    assert main["totals"]["first_start"].startswith("2026-09-29T06:00")
    assert main["learning"] == {"lessons": 1, "proposals": 1, "skills": 1, "skills_replayed": 1}
    assert main["agents"][0]["lane"] == "L-api"
    assert main["orchestrator"][0]["message"] == "round A: L-api"

    detail = data.agent_json(repo, "L-api", ps_output="")
    live = data.load(repo, with_tokens=False, ps_output="x tools.factory.run_lane --lane L-api y")
    assert (live.agents[0].alive, live.agents[0].state) == (True, "working")
    assert json.loads(json.dumps(detail)) == detail
    assert [e["message"] for e in detail["activity"]] == ["m", "reads api/main.py"]
    assert "## Lesson" in detail["progress"]
    assert detail["trace"] == []
    assert data.agent_json(repo, "L-nope", ps_output="") == {"found": False}


def test_theme_is_remembered_and_only_known_themes_are_kept(tmp_path):
    assert data.read_theme(tmp_path) == ""
    assert data.write_theme(tmp_path, "dark") == "dark"
    assert data.read_theme(tmp_path) == "dark"
    assert data.write_theme(tmp_path, "neon") == "dark"
    (tmp_path / ".factory" / "ui.json").write_text("{")
    assert data.read_theme(tmp_path) == ""


def test_changes_without_a_worktree():
    assert "No worktree" in data.changes(data.CLAUDE_PROJECTS, data.Agent(lane="L-x"))


def test_spans_and_counts_read_well():
    start = datetime(2026, 9, 29, 6, 0, tzinfo=UTC)
    assert data.span(start, datetime(2026, 9, 29, 6, 8, 5, tzinfo=UTC)) == "8m 05s"
    assert data.span(start, datetime(2026, 9, 29, 8, 3, tzinfo=UTC)) == "2h 03m"
    assert data.span(None, start) == ""
    assert [data.short_count(n) for n in (12, 4_200, 2_600_000)] == ["12", "4k", "2.6M"]
    assert data.parse_time("never") is None


def test_a_changed_line_breaks_the_ledger_seal():
    rows = []
    prev = "0" * 64
    for n in range(3):
        row = {"at": T0, "lane": "L-api", "kind": "step", "message": f"step {n}", "prev": prev}
        row["hash"] = data.seal(row)
        prev = row["hash"]
        rows.append(row)
    assert data.ledger_problems([{"lane": "old", "message": "unsealed"}, *rows]) == []
    rows[1]["message"] = "rewritten"
    assert data.ledger_problems(rows) == ["line 2: contents do not match their seal"]
    rows[1]["message"] = "step 1"
    assert data.ledger_problems([rows[0], rows[2]]) == [
        "line 2: does not follow the line before it"
    ]
    assert "unsealed line" in data.ledger_problems([rows[0], {"message": "slipped in"}])[0]


def test_runs_cards_follow_run_ids_costs_and_merges():
    agents = data.agents_from_events(
        [
            {**ev("L-api", "start", "m"), "run_id": "l-api-1"},
            {**ev("L-api", "cost", "attempt 1 ended"), "run_id": "l-api-1", "cost_usd": 1.5},
            {**ev("L-api", "alert", "loop: x", agent="orchestrator"), "run_id": "l-api-1"},
            {**ev("L-api", "done", "done: passes"), "run_id": "l-api-1"},
            {**ev("L-api", "merge", "merged 2 files", agent="orchestrator"), "run_id": "l-api-1"},
            {**ev("L-web", "start", "health"), "task": "health/builder/L-web", "run_id": "l-web-h"},
            {**ev("L-web", "step", "writes web/HEALTH.txt"), "run_id": "l-web-h"},
            {**ev("L-web", "done", "done"), "run_id": "l-web-h"},
            ev("orchestrator:phase-2", "start", "x"),
        ]
    )
    assert list(agents) == ["L-api"]
    api = agents["L-api"]
    assert (api.run_id, api.cost_usd, api.merged, api.state, api.agent) == (
        "l-api-1",
        1.5,
        True,
        "done",
        "builder",
    )


def test_snapshot_carries_spend_alerts_metrics_and_the_stop_state(tmp_path):
    repo = tmp_path / "duly"
    (repo / ".factory").mkdir(parents=True)
    (repo / "factory").mkdir()
    (repo / "factory" / "config.yaml").write_text("budgets:\n  per_day_usd: 250.0\n")
    (repo / ".factory" / "STOP").write_text("{}")
    runs = [
        {
            "agent": "builder",
            "status": "done",
            "attempts": 1,
            "cost_usd": 4.0,
            "seconds": 360,
            "ended_at": "2026-09-29T07:00:00+00:00",
            "task": "p/A/L-api",
        },
        {
            "agent": "builder",
            "status": "failed",
            "attempts": 3,
            "cost_usd": 6.0,
            "seconds": 840,
            "ended_at": "2026-09-28T07:00:00+00:00",
            "task": "p/A/L-web",
        },
        {
            "agent": "builder",
            "status": "done",
            "attempts": 1,
            "cost_usd": 0.3,
            "seconds": 20,
            "ended_at": "2026-09-29T07:00:00+00:00",
            "task": "health/builder/L-api",
        },
    ]
    (repo / ".factory" / "metrics.jsonl").write_text("\n".join(json.dumps(r) for r in runs))
    (repo / ".factory" / "events.jsonl").write_text(
        json.dumps({**ev("L-api", "alert", "budget: used up"), "alert": "budget"}) + "\n"
    )
    now = datetime(2026, 9, 29, 9, 0, tzinfo=UTC)
    snap = data.load(repo, with_tokens=False, ps_output="", now=now)
    assert snap.stopped is True
    assert (snap.spent_today, snap.day_cap) == (4.3, 250.0)
    assert snap.metrics == {
        "builder": {
            "runs": 2,
            "success_rate": 0.5,
            "mean_attempts": 2.0,
            "mean_cost_usd": 5.0,
            "mean_minutes": 10.0,
        }
    }
    assert snap.alerts[0]["alert"] == "budget"
    main = data.snapshot_json(repo, ps_output="", environ={}, auth_json="{}")
    assert main["stopped"] is True
    assert main["spend"]["charged"] is False
    assert main["alerts"][0]["kind"] == "budget"
    assert main["ledger"]["intact"] is True


def test_health_shows_every_agent_and_lane_and_goes_out_of_date(tmp_path):
    repo = tmp_path / "duly"
    for folder in ("factory/agents", ".claude/agents", ".claude/lanes", "tools/factory", "engine"):
        (repo / folder).mkdir(parents=True)
    (repo / "factory" / "agents" / "builder.yaml").write_text(
        "name: builder\nrole_file: .claude/agents/builder.md\nlanes: [L-engine, L-desktop]\n"
    )
    (repo / ".claude" / "agents" / "builder.md").write_text("role")
    (repo / ".claude" / "lanes" / "L-engine.yaml").write_text('owned: ["engine/**"]\n')
    (repo / ".claude" / "lanes" / "L-desktop.yaml").write_text('owned: ["desktop/**"]\n')
    (repo / "tools" / "factory" / "sandbox.py").write_text("a")
    (repo / "tools" / "factory" / "agent_run.py").write_text("b")

    rows = data.health_rows(repo, {})
    assert [(r["agent"], r["lane"], r["state"]) for r in rows] == [
        ("builder", "L-engine", "not checked")
    ]  # desktop has no folder yet

    parts = [(repo / "factory" / "agents" / "builder.yaml").read_bytes(), b"role", b"a", b"b"]
    mark = data.hashlib.sha256(b"\0".join(parts)).hexdigest()[:20]
    record = {"builder:L-engine": {"fingerprint": mark, "at": T0, "run_id": "r"}}
    assert data.health_rows(repo, record)[0]["state"] == "passed"
    (repo / "tools" / "factory" / "sandbox.py").write_text("changed")
    assert data.health_rows(repo, record)[0]["state"] == "out of date"


def test_dollars_are_for_credits_only():
    sub = '{"loggedIn": true, "authMethod": "claude.ai", "subscriptionType": "max"}'
    assert data.billing({}, sub) == {"charged": False, "plan": "Max subscription"}
    assert data.billing({"ANTHROPIC_API_KEY": "k"}, sub) == {"charged": True, "plan": "API credits"}
    assert data.billing({}, '{"loggedIn": true, "authMethod": "apiKey"}')["charged"] is True
    assert data.billing({}, "not json") == {"charged": False, "plan": "unknown"}


def test_running_counts_every_live_run_and_names_its_kind(tmp_path):
    import os

    repo = tmp_path / "duly"
    (repo / ".factory").mkdir(parents=True)
    me = os.getpid()
    runs = {
        "a": {
            "lane": "L-api",
            "agent": "builder",
            "task": "p/A/L-api",
            "pid": me,
            "started_at": "2026-09-29T10:00:00+00:00",
        },
        "b": {
            "lane": "L-factory",
            "agent": "skill-curator",
            "pid": me,
            "task": "health/skill-curator/L-factory",
            "started_at": "2026-09-29T10:01:00+00:00",
        },
        "c": {
            "lane": "L-web",
            "agent": "builder",
            "task": "p/A/L-web",
            "pid": 2_000_000_000,
            "started_at": "2026-09-29T10:02:00+00:00",
        },
        "d": {
            "lane": "orchestrator:p",
            "agent": "orchestrator",
            "task": "orchestrate:p",
            "pid": me,
            "started_at": "2026-09-29T09:59:00+00:00",
        },
    }
    (repo / ".factory" / "registry.json").write_text(json.dumps({"runs": runs}))
    live = data.live_runs(repo)
    assert [(r["run_id"], r["kind"]) for r in live] == [("a", "work"), ("b", "health")]
    assert data.live_runs(tmp_path / "nowhere") == []


def test_whoever_is_working_comes_first_and_running_checks_are_shown(tmp_path):
    import os

    repo = tmp_path / "duly"
    (repo / ".factory").mkdir(parents=True)
    me = os.getpid()
    events = [
        {**ev("L-api", "start", "old work", at="2026-09-29T08:00:00+00:00"), "run_id": "a"},
        {**ev("L-api", "done", "done", at="2026-09-29T08:10:00+00:00"), "run_id": "a"},
        {
            **ev("L-web", "start", "finished check", at="2026-09-29T08:20:00+00:00"),
            "run_id": "h0",
            "task": "health/builder/L-web",
        },
        {**ev("L-web", "done", "done", at="2026-09-29T08:21:00+00:00"), "run_id": "h0"},
        {**ev("L-tests", "start", "newer work", at="2026-09-29T09:00:00+00:00"), "run_id": "t"},
        {**ev("L-tests", "done", "done", at="2026-09-29T09:30:00+00:00"), "run_id": "t"},
        {**ev("L-engine", "start", "work now", at="2026-09-29T10:05:00+00:00"), "run_id": "e"},
        {
            **ev("L-ops", "start", "check now", at="2026-09-29T10:00:00+00:00", agent="builder"),
            "run_id": "h1",
            "task": "health/builder/L-ops",
        },
        {
            **ev("L-ops", "step", "writes ops/HEALTH.txt", at="2026-09-29T10:00:30+00:00"),
            "run_id": "h1",
        },
    ]
    (repo / ".factory" / "events.jsonl").write_text("\n".join(json.dumps(e) for e in events))
    runs = {
        "e": {
            "lane": "L-engine",
            "agent": "builder",
            "task": "p/B/L-engine",
            "pid": me,
            "started_at": "2026-09-29T10:05:00+00:00",
        },
        "h1": {
            "lane": "L-ops",
            "agent": "builder",
            "task": "health/builder/L-ops",
            "pid": me,
            "started_at": "2026-09-29T10:00:00+00:00",
        },
    }
    (repo / ".factory" / "registry.json").write_text(json.dumps({"runs": runs}))
    snap = data.load(repo, with_tokens=False, ps_output="")
    assert [(a.lane, a.alive, a.kind) for a in snap.agents] == [
        ("L-ops, health check", True, "health"),
        ("L-engine", True, "work"),
        ("L-tests", False, "work"),
        ("L-api", False, "work"),
    ]
    assert snap.agents[0].last_action == "writes ops/HEALTH.txt"


def test_an_alert_that_was_dealt_with_leaves_the_list():
    first = {**ev("founder", "alert", "eval_drop: golden tasks: 0% passed"), "hash": "aaa"}
    second = {**ev("L-api", "alert", "loop: the same action"), "hash": "bbb"}
    fixed = {**ev("founder", "control", "handled: fixed and rerun"), "handles": "aaa"}
    assert [a["hash"] for a in data.open_alerts([first, second], set())] == ["aaa", "bbb"]
    assert [a["hash"] for a in data.open_alerts([first, second, fixed], set())] == ["bbb"]


def test_an_alert_leaves_the_list_when_its_task_later_passes():
    events = [
        {
            **ev("L-web", "start", "m", at="2026-09-29T09:00:00+00:00"),
            "run_id": "w1",
            "task": "p/A/L-web",
        },
        {
            **ev("L-web", "alert", "loop: x", at="2026-09-29T09:05:00+00:00"),
            "run_id": "w1",
            "hash": "a1",
        },
        {
            **ev("L-api", "start", "m", at="2026-09-29T09:00:00+00:00"),
            "run_id": "p1",
            "task": "p/A/L-api",
        },
        {
            **ev("L-api", "alert", "stall: x", at="2026-09-29T09:06:00+00:00"),
            "run_id": "p1",
            "hash": "a2",
        },
        {
            **ev("L-web", "start", "m", at="2026-09-29T09:10:00+00:00"),
            "run_id": "w2",
            "task": "p/A/L-web",
        },
        {**ev("L-web", "done", "done: passes", at="2026-09-29T09:20:00+00:00"), "run_id": "w2"},
    ]
    assert [a["hash"] for a in data.open_alerts(events, set())] == ["a2"]


def test_notes_to_claude_and_their_replies(tmp_path):
    repo = tmp_path / "duly"
    repo.mkdir()
    now = datetime(2026, 9, 29, 11, 0, tzinfo=UTC)
    assert data.add_note(repo, "   ", now) == {}
    first = data.add_note(repo, "The count says 0 but an agent is running", now)
    second = data.add_note(repo, "The panel is cut off when the window is wide", now)
    rows = [
        {
            "kind": "reply",
            "note": first["id"],
            "text": "Looking now.",
            "keep_open": True,
            "at": "2026-09-29T11:01:00+00:00",
        },
        {
            "kind": "reply",
            "note": first["id"],
            "text": "Fixed and reopened.",
            "keep_open": False,
            "at": "2026-09-29T11:09:00+00:00",
        },
    ]
    with (repo / ".factory" / "inbox.jsonl").open("a") as handle:
        handle.write("".join(json.dumps(r) + "\n" for r in rows))
    notes = {n["id"]: n for n in data.read_notes(repo)}
    assert notes[first["id"]]["state"] == "done"
    assert [r["text"] for r in notes[first["id"]]["replies"]] == [
        "Looking now.",
        "Fixed and reopened.",
    ]
    assert notes[second["id"]]["state"] == "open"
    assert notes[second["id"]]["replies"] == []


def test_the_window_says_what_it_can_see_is_wrong(tmp_path):
    repo = tmp_path / "duly"
    (repo / ".factory").mkdir(parents=True)
    (tmp_path / "duly-worktrees" / "old-run").mkdir(parents=True)
    events = [
        {**ev("L-api", "start", "m"), "run_id": "a"},
        {
            **ev("L-api", "alert", "stall: x", at="2026-09-28T01:00:00+00:00"),
            "run_id": "a",
            "hash": "h",
        },
    ]
    (repo / ".factory" / "events.jsonl").write_text("\n".join(json.dumps(e) for e in events))
    (repo / ".factory" / "registry.json").write_text(
        json.dumps(
            {
                "runs": {
                    "gone": {"lane": "L-web", "task": "t", "pid": 2_000_000_000, "worktree": "x"}
                }
            }
        )
    )
    (repo / ".factory" / "gates.json").write_text(json.dumps({"results": {"types": "fail"}}))
    now = datetime(2026, 9, 29, 12, 0, tzinfo=UTC)
    snap = data.load(repo, with_tokens=False, ps_output="", now=now)
    found = " ".join(data.self_check(repo, snap, [], now))
    for part in (
        "L-api shows as working",
        "1 claims are held",
        "1 alerts have been open",
        "1 worktrees are left over",
        "did not all pass: types",
    ):
        assert part in found
    quiet = tmp_path / "quiet"
    quiet.mkdir()
    assert (
        data.self_check(quiet, data.load(quiet, with_tokens=False, ps_output="", now=now), [], now)
        == []
    )


def test_the_header_says_whether_a_plan_is_running(tmp_path):
    import os

    repo = tmp_path / "duly"
    (repo / ".factory").mkdir(parents=True)
    events = [
        ev("founder", "start", "round A: L-api", agent="orchestrator"),
        ev(
            "founder",
            "blocked",
            "round A stopped",
            agent="orchestrator",
            at="2026-09-29T07:00:00+00:00",
        ),
    ]
    assert data.plan_state(repo, events) == {
        "running": False,
        "branch": "",
        "message": "round A stopped",
        "at": "2026-09-29T07:00:00+00:00",
    }
    (repo / ".factory" / "registry.json").write_text(
        json.dumps(
            {
                "runs": {
                    "o": {
                        "lane": "orchestrator:product-1",
                        "task": "orchestrate:product-1",
                        "pid": os.getpid(),
                    }
                }
            }
        )
    )
    assert data.plan_state(repo, events)["running"] is True
    assert data.plan_state(repo, events)["branch"] == "product-1"
