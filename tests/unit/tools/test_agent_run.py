"""The factory's own behaviour, tested with a stand-in for the agent binary.

Covers the ordinary path and the chaos cases: a missing report, malformed output, a crash,
a hang, a loop, the wrong model, writes outside the lane, tampering with a protected
branch, the kill switch, a claim held by another run, and spent budgets.
"""

import dataclasses
import json
import os
import signal
import subprocess
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from engine.clocks import FixedClock
from tests.support import mini_factory as mini
from tools.factory import agent_run, health, jail, ledger, memory, registry, telemetry

pytestmark = pytest.mark.skipif(not jail.available(), reason="no sandbox on this machine")
CLOCK = FixedClock(datetime(2026, 9, 29, 12, 0, tzinfo=UTC))


def task(done="test -f engine/new.py", lane="L-engine", agent="builder", name="t/1"):
    return agent_run.Task(
        lane, agent, name, "specs/x.md", "Add engine/new.py. Nothing else.", done, "phase-x"
    )


def play(tmp_path, monkeypatch, attempts, repo=None, **kwargs):
    repo = repo or mini.build(tmp_path)
    for key, value in mini.scenario(tmp_path, attempts).items():
        monkeypatch.setenv(key, value)
    return repo, agent_run.run(task(**kwargs), CLOCK, repo)


def test_the_ordinary_path(tmp_path, monkeypatch):
    repo, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])])
    assert (out.status, out.attempts) == ("done", 1)
    assert out.files_changed == ["engine/new.py"]
    assert out.cost_usd == 0.25
    assert out.sessions == ["fake-session-1"]
    message = mini.git(repo, "log", "-1", "--format=%an|%B", out.branch)
    assert message.startswith("builder|L-engine: Add engine/new.py. Nothing else.")
    for trailer in (
        f"Factory-Run: {out.run_id}",
        "Factory-Trace: fake-session-1",
        f"Factory-Base: {out.base_commit}",
        "contract v1",
    ):
        assert trailer in message
    assert "REPORT.json" not in mini.git(repo, "show", "--stat", "--format=", out.branch)
    assert mini.git(repo, "rev-parse", "phase-x") == out.base_commit  # nothing was merged
    start = next(r for r in ledger.read(repo) if r["kind"] == "start")
    assert start["pid"] == os.getpid()  # R4: the reaper reads it once the claim is gone
    assert ledger.verify(repo) == []
    assert registry.active(repo) == {}
    assert telemetry.read_runs(repo)[0]["status"] == "done"
    trace = (repo / ".factory" / "otel" / "traces.jsonl").read_text()
    assert "gen_ai.agent.name" in trace


def test_hidden_tests_are_not_in_a_builders_worktree(tmp_path, monkeypatch):
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])])
    assert not (Path(out.worktree) / "tests" / "holdout" / "test_hidden.py").exists()
    assert "test_hidden" not in " ".join(out.files_changed)


def test_the_orchestrator_runs_the_done_command_itself(tmp_path, monkeypatch):
    says_done = [{"init": mini.MODEL}, {"report": "engine", "files": []}, {"result": {"cost": 0.1}}]
    _, out = play(tmp_path, monkeypatch, [says_done, says_done])
    # The same code failing again is not a second failure: no escalation, the attempts run out.
    assert (out.status, out.attempts) == ("failed", 3)
    assert "the done command fails: exit 1 from test -f engine/new.py" in out.reason


def test_a_missing_report_costs_an_attempt_and_the_next_is_told_why(tmp_path, monkeypatch):
    no_report = [{"init": mini.MODEL}, {"write": "engine/new.py"}, {"result": {"cost": 0.1}}]
    _, out = play(tmp_path, monkeypatch, [no_report, mini.good(["engine/new.py"])])
    assert (out.status, out.attempts) == ("done", 2)
    assert out.cost_usd == 0.35


def test_a_report_that_leaves_out_a_changed_file_is_refused(tmp_path, monkeypatch):
    hides = [
        {"init": mini.MODEL},
        {"write": "engine/new.py"},
        {"write": "engine/extra.py"},
        {"report": "engine", "files": ["engine/new.py"]},
        {"result": {}},
    ]
    _, out = play(tmp_path, monkeypatch, [hides, hides])
    assert out.status == "failed"
    assert "leaves out files that changed: engine/extra.py" in out.reason


@pytest.mark.parametrize(
    "body",
    [
        '{"status": "done"}',
        "not json at all",
        '{"run_id": "other-run", "status": "done", '
        '"summary": "long enough summary", "commands_run": [], "files_changed": [], '
        '"lessons": [], "disputes": [], "requests": []}',
    ],
)
def test_a_malformed_report_is_refused(tmp_path, monkeypatch, body):
    bad = [
        {"init": mini.MODEL},
        {"write": "engine/new.py"},
        {"report": "engine", "body": body},
        {"result": {}},
    ]
    _, out = play(tmp_path, monkeypatch, [bad, bad])
    assert out.status == "failed"
    assert "REPORT.json" in out.reason


def test_malformed_output_and_a_crash_are_survived(tmp_path, monkeypatch):
    crash = [{"raw": "{{{ not json"}, {"raw": ""}, {"exit": 3}]
    _, out = play(tmp_path, monkeypatch, [crash, mini.good(["engine/new.py"])])
    assert (out.status, out.attempts) == ("done", 2)


def test_a_hang_is_stopped_by_the_time_limit(tmp_path, monkeypatch):
    hang = [{"init": mini.MODEL}, {"tool": "Bash", "input": {"command": "x"}}, {"sleep": 30}]
    repo = mini.build(tmp_path, limits={"stall_minutes": 1000, "seconds_per_minute": 0.02})
    _, out = play(tmp_path, monkeypatch, [hang, hang], repo=repo)
    assert out.status == "failed"
    assert "timeout" in out.reason
    assert out.seconds < 20


def test_silence_is_stopped_as_a_stall(tmp_path, monkeypatch):
    repo = mini.build(tmp_path, limits={"stall_minutes": 5, "seconds_per_minute": 0.02})
    hang = [{"init": mini.MODEL}, {"sleep": 30}]
    _, out = play(tmp_path, monkeypatch, [hang, hang], repo=repo)
    assert "stall" in out.reason


def test_the_same_action_over_and_over_is_stopped(tmp_path, monkeypatch):
    loop = [
        {"init": mini.MODEL},
        {"tool": "Bash", "input": {"command": "uv run pytest"}, "times": 6},
        {"sleep": 30},
    ]
    repo, out = play(tmp_path, monkeypatch, [loop, loop])
    assert "loop" in out.reason
    assert any("stopped: loop" in row["failure"] for row in memory.read(repo))
    assert any(row.get("alert") == "loop" for row in ledger.read(repo))


def test_the_wrong_model_is_refused(tmp_path, monkeypatch):
    _, out = play(tmp_path, monkeypatch, [[{"init": "claude-haiku-4-5"}, {"sleep": 30}]])
    assert out.status == "refused"
    assert "pinned" in out.reason


def test_a_token_budget_stops_the_run(tmp_path, monkeypatch):
    greedy = [{"init": mini.MODEL}, {"usage": {"in": 9_000_000, "out": 10}}, {"sleep": 30}]
    _, out = play(tmp_path, monkeypatch, [greedy, greedy])
    assert (out.status, out.attempts) == ("failed", 1)  # R2: a used up budget is not retried
    assert "budget" in out.reason
    assert (out.cause, out.signature) == ("factory", "budget.used_up")


def test_cache_reads_count_at_a_tenth_against_the_budget(tmp_path, monkeypatch):
    # Nine million tokens read from the cache charge 900,000, well inside the budget.
    steps = mini.good(["engine/new.py"])
    steps.insert(1, {"usage": {"in": 100, "out": 10, "cached": 9_000_000}})
    _, out = play(tmp_path, monkeypatch, [steps])
    assert out.status == "done"
    assert out.tokens_charged == 100 + 10 + 900_000
    assert out.tokens_in == 9_000_100  # telemetry keeps the raw count


def test_work_cut_off_by_the_budget_is_kept_on_its_branch_and_not_merged(tmp_path, monkeypatch):
    greedy = [
        {"init": mini.MODEL},
        {"write": "engine/new.py"},
        {"write": "tests/cheat.py"},
        {"usage": {"in": 9_000_000, "out": 10}},
        {"sleep": 30},
    ]
    repo, out = play(tmp_path, monkeypatch, [greedy])
    assert out.status == "failed"
    assert out.kept_commit
    kept = mini.git(repo, "show", "--stat", "--format=%B", out.kept_commit)
    assert "not accepted" in kept
    assert "engine/new.py" in kept
    assert "tests/cheat.py" not in kept  # nothing outside the lane is kept
    assert out.head_commit == ""
    assert mini.git(repo, "rev-parse", "phase-x") == out.base_commit  # nothing was merged
    # Its own ref keeps it when a retry resets the branch (make doctor saw LOST otherwise).
    refs = mini.git(repo, "for-each-ref", "--format=%(objectname)", "refs/factory/kept/")
    assert out.kept_commit in refs.split()


def test_writes_outside_the_lane_are_never_accepted(tmp_path, monkeypatch):
    strays = [
        {"init": mini.MODEL},
        {"write": "engine/new.py"},
        {"write": "tests/cheat.py"},
        {"report": "engine", "files": ["engine/new.py", "tests/cheat.py"]},
        {"result": {}},
    ]
    _repo, out = play(tmp_path, monkeypatch, [strays, strays])
    assert out.status == "failed"
    assert "files outside the lane changed: tests/cheat.py" in out.reason
    assert out.head_commit == ""


def test_moving_a_protected_branch_fails_the_run(tmp_path, monkeypatch):
    tamper = [
        {"init": mini.MODEL},
        {"write": "engine/new.py"},
        {"git": ["commit", "--allow-empty", "-q", "-m", "x"]},
        {"git": ["branch", "-f", "phase-x", "HEAD"]},
        {"report": "engine", "files": ["engine/new.py"]},
        {"result": {}},
    ]
    repo, out = play(tmp_path, monkeypatch, [tamper])
    assert out.status == "failed"
    assert "refs/heads/phase-x" in out.reason
    assert any(row.get("alert") == "tamper" for row in ledger.read(repo))
    assert not any(row.get("cause") == "flake" for row in ledger.read(repo))


def test_r2_a_tamper_check_that_passes_on_its_retry_is_a_flake(tmp_path, monkeypatch):
    real = agent_run.protected_state
    calls: list[int] = []

    def settling(repo, branches):
        calls.append(1)
        state = real(repo, branches)
        return {**state, "refs/heads/phase-x": "moving"} if len(calls) == 2 else state

    monkeypatch.setattr(agent_run, "protected_state", settling)
    repo, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])])
    assert out.status == "done", out.reason
    assert len(calls) == 3  # before the run, the check, and its one retry
    rows = ledger.read(repo)
    assert not any(row.get("alert") == "tamper" for row in rows)
    (flake,) = [r for r in rows if r.get("cause") == "flake"]
    assert (flake["signature"], flake["lane"], flake["run_id"]) == (
        "tamper.L-engine",
        "L-engine",
        out.run_id,
    )


def test_nothing_starts_while_the_factory_is_stopped(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    registry.stop_all("test", repo)
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert out.status == "refused"
    assert "stopped" in out.reason
    assert registry.resume(repo) is True
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert out.status == "done"


def test_a_lane_or_a_task_can_be_claimed_once(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    registry.claim("other-run", "L-engine", "t/0", "w", "c", "builder", repo, pid=os.getpid())
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert out.status == "refused"
    assert "already claimed by run other-run" in out.reason
    registry.release("other-run", repo)
    registry.claim("other-run", "L-api", "t/1", "w", "c", "builder", repo, pid=os.getpid())
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert "task t/1 is already claimed" in out.reason


def test_a_claim_whose_process_is_gone_is_dropped(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    registry.claim("dead-run", "L-engine", "t/1", "w", "c", "builder", repo, pid=2_000_000_000)
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert out.status == "done"


def test_the_cap_for_the_day_refuses_a_run(tmp_path, monkeypatch):
    repo = mini.build(tmp_path, budgets={"per_day_usd": 1.0})
    telemetry.record_run(
        {
            "agent": "builder",
            "status": "done",
            "cost_usd": 1.0,
            "ended_at": "2026-09-29T09:00:00+00:00",
        },
        repo,
    )
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert out.status == "refused"
    assert "cap for today" in out.reason


def test_an_agent_with_no_contract_for_the_lane_is_refused(tmp_path, monkeypatch):
    _, out = play(tmp_path, monkeypatch, [mini.good(["tests/a.py"], "tests")], lane="L-tests")
    assert out.status == "refused"
    assert "no contract for lane L-tests" in out.reason


def test_an_agent_can_escalate_and_is_not_asked_again(tmp_path, monkeypatch):
    gives_up = [
        {"init": mini.MODEL},
        {
            "report": "engine",
            "status": "escalated",
            "summary": "The test contradicts the SPEC; see disputes.",
        },
        {"result": {}},
    ]
    monkeypatch.setenv("DULY_PLAN", "product-2")
    repo, out = play(tmp_path, monkeypatch, [gives_up])
    assert (out.status, out.attempts) == ("escalated", 1)
    assert "contradicts the SPEC" in out.reason
    # A stop is filed under its plan, and its cause is unknown until someone names it.
    stop = [r for r in ledger.read(repo) if r["kind"] == "blocked"][-1]
    assert (stop["plan"], stop["cause"]) == ("product-2", "unknown")


def test_an_escalation_with_disputes_blames_the_spec(tmp_path, monkeypatch):
    monkeypatch.delenv("DULY_PLAN", raising=False)
    repo = mini.build(tmp_path)
    report = {
        "run_id": "l-engine-disputed",
        "status": "escalated",
        "summary": "The test contradicts the SPEC.",
        "commands_run": [],
        "files_changed": [],
        "lessons": [],
        "disputes": ["tests/x.py expects 30 days; SPEC point 4 says 60"],
        "requests": [],
    }
    steps = [{"init": mini.MODEL}, {"report": "engine", "body": report}, {"result": {}}]
    for key, value in mini.scenario(tmp_path, [steps]).items():
        monkeypatch.setenv(key, value)
    job = dataclasses.replace(task(), run_id="l-engine-disputed")
    out = agent_run.run(job, CLOCK, repo)
    assert out.status == "escalated"
    stop = [r for r in ledger.read(repo) if r["kind"] == "blocked"][-1]
    assert (stop["plan"], stop["cause"]) == ("", "spec")


def test_a_finished_run_carries_its_plan_and_no_cause(tmp_path, monkeypatch):
    monkeypatch.setenv("DULY_PLAN", "product-2")
    repo, _ = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])])
    done = [r for r in ledger.read(repo) if r["kind"] == "done"][-1]
    assert done["plan"] == "product-2"
    assert "cause" not in done
    assert telemetry.read_runs(repo)[-1]["plan"] == "product-2"  # and so does its metrics row


def test_an_agents_lessons_reach_no_one(tmp_path, monkeypatch):
    lesson = {
        "failure": "The done command was piped through tail and hid its exit code.",
        "fix": "Run it unpiped.",
        "evidence": "run log",
    }
    steps = mini.good(["engine/new.py"])
    steps[-2]["lessons"] = [lesson]
    repo, out = play(tmp_path, monkeypatch, [steps])
    assert out.status == "done"
    # What an agent says about its own run is neither filed nor handed to a later agent.
    assert not list((repo / ".claude" / "LESSONS" / "proposals").glob("*.md"))
    assert memory.read(repo) == []
    assert "piped through tail" not in memory.for_prompt("L-engine", 8, 3000, repo)


def test_a_tasks_failures_leave_memory_once_it_passes(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    memory.record("L-engine", "an old failure", "a fix", "run", "orchestrator", repo, task="t/1")
    memory.record("L-engine", "another task", "a fix", "run", "orchestrator", repo, task="t/2")
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert out.status == "done"
    assert [row["task"] for row in memory.read(repo)] == ["t/2"]


def test_a_health_probe_runs_on_its_own_model_with_a_short_prompt(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    memory.record("L-engine", "an old failure", "a fix", "run", "orchestrator", repo, task="t/1")
    probe_model = health.model(repo)
    assert probe_model != mini.MODEL
    steps = [
        {"init": probe_model},
        *write_call("engine/new.py", ok=True),
        {"report": "engine", "files": ["engine/new.py"]},
        {"result": {}},
    ]
    _, out, calls = launched(tmp_path, monkeypatch, [steps], repo=repo, name="health/builder")
    assert out.status == "done", out.reason
    assert out.model == probe_model
    assert after(calls[0], "--model") == probe_model
    prompt = after(calls[0], "-p")
    assert prompt.startswith("This is a health check of the walls around lane L-engine.")
    assert "an old failure" not in prompt
    assert memory.read(repo)  # a probe changes no memory


def test_a_run_that_is_not_a_probe_is_held_to_the_pinned_model(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    steps = mini.good(["engine/new.py"])
    steps[0] = {"init": health.model(repo)}
    _, out = play(tmp_path, monkeypatch, [steps], repo=repo)
    assert out.status == "refused"
    assert "pinned" in out.reason


def test_a_rerun_of_the_same_task_leaves_no_duplicate(tmp_path, monkeypatch):
    repo, first = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])])
    _, second = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert first.status == second.status == "done"
    assert first.base_commit == second.base_commit
    assert first.branch != second.branch
    assert mini.git(repo, "rev-parse", "phase-x") == first.base_commit
    assert json.loads((repo / ".factory" / "registry.json").read_text())["runs"] == {}


def test_an_agents_own_commits_never_carry_its_report(tmp_path, monkeypatch):
    commits = [
        {"init": mini.MODEL},
        {"write": "engine/new.py"},
        {"report": "engine", "files": ["engine/new.py"]},
        {"git": ["add", "-A", "-f"]},
        {
            "git": [
                "-c",
                "user.name=a",
                "-c",
                "user.email=a@a.invalid",
                "commit",
                "-q",
                "-m",
                "mine",
            ]
        },
        {"write": "engine/PROGRESS.md", "text": "# log\n"},
        {"report": "engine", "files": ["engine/new.py", "engine/PROGRESS.md"]},
        {"result": {"cost": 0.2}},
    ]
    repo, out = play(tmp_path, monkeypatch, [commits])
    assert out.status == "done", out.reason
    assert out.files_changed == ["engine/PROGRESS.md", "engine/new.py"]
    log = mini.git(repo, "log", "--format=%an %s", f"{out.base_commit}..{out.branch}")
    assert log.splitlines() == ["builder L-engine: Add engine/new.py. Nothing else."]
    assert ".lane" not in mini.git(repo, "ls-tree", "-r", "--name-only", out.branch)


def test_the_founders_work_on_another_branch_does_not_fail_a_run(tmp_path, monkeypatch):
    elsewhere = [
        {"init": mini.MODEL},
        {"git": ["branch", "founder-work", "HEAD"]},
        {"git": ["branch", "-f", "founder-work", "HEAD~0"]},
        *mini.good(["engine/new.py"])[1:],
    ]
    _, out = play(tmp_path, monkeypatch, [elsewhere])
    assert out.status == "done", out.reason


def test_a_run_that_reports_a_key_in_use_is_ended_at_once(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    path = tmp_path / "keyed.json"
    # The stand-in cannot add fields to its first event, so the event is given raw.
    first = json.dumps(
        {
            "type": "system",
            "subtype": "init",
            "session_id": "s",
            "model": mini.MODEL,
            "apiKeySource": "ANTHROPIC_API_KEY",
        }
    )
    keyed = [{"raw": first}, {"write": "engine/new.py"}, {"sleep": 30}]
    _, out = play(tmp_path, monkeypatch, [keyed], repo=repo)
    assert out.status == "refused"
    assert "key in use" in out.reason
    assert out.seconds < 20
    assert any(row.get("alert") == "guardrail" for row in ledger.read(repo))
    assert path.exists() is False


def test_project_settings_that_name_a_key_refuse_the_run(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    (repo / ".claude" / "settings.json").write_text('{"apiKeyHelper": "get-key.sh"}')
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    assert out.status == "refused"
    assert "apiKeyHelper" in out.reason


def launched(tmp_path, monkeypatch, attempts, repo=None, **kwargs):
    """Play a scenario and keep the arguments of each launch of the agent binary."""
    repo = repo or mini.build(tmp_path)
    for key, value in mini.scenario(tmp_path, attempts).items():
        monkeypatch.setenv(key, value)
    calls = tmp_path / "argv.jsonl"
    wrapper = tmp_path / "wrapper-agent"
    wrapper.write_text(
        "#!/bin/sh\n"
        f'"{sys.executable}" -c "import json, sys; '
        "open(sys.argv[1], 'a').write(json.dumps(sys.argv[2:]) + chr(10))\" "
        f'"{calls}" "$@"\n'
        f'exec "{os.environ["DULY_CLAUDE_BIN"]}" "$@"\n'
    )
    wrapper.chmod(0o755)
    monkeypatch.setenv("DULY_CLAUDE_BIN", str(wrapper))
    out = agent_run.run(task(**kwargs), CLOCK, repo)
    return repo, out, [json.loads(line) for line in calls.read_text().splitlines()]


def after(argv, flag):
    return argv[argv.index(flag) + 1]


def result_event(**fields):
    return {
        "raw": json.dumps({"type": "result", "session_id": "s", "total_cost_usd": 0.3, **fields})
    }


def test_the_result_event_replaces_the_streamed_placeholder_output(tmp_path, monkeypatch):
    # Streamed events carry a placeholder output count; the result event holds the true one.
    steps = mini.good(["engine/new.py"])[:-1]
    steps.insert(1, {"usage": {"in": 100, "out": 8, "cached": 1000}})
    usage = {
        "input_tokens": 70,
        "cache_creation_input_tokens": 90_842,
        "cache_read_input_tokens": 2_577_607,
        "output_tokens": 26_346,
    }
    steps.append(result_event(usage=usage, num_turns=36))
    repo, out = play(tmp_path, monkeypatch, [steps])
    assert out.status == "done", out.reason
    assert out.tokens == usage
    assert out.tokens_out == 26_346
    assert out.tokens_in == 70 + 90_842 + 2_577_607
    assert out.tokens_charged == 70 + 90_842 + 257_760 + 26_346
    row = next(r for r in ledger.read(repo) if r["kind"] == "done")
    assert row["tokens"] == usage
    assert {"seconds", "wall_seconds"} <= set(row)
    assert telemetry.read_runs(repo)[0]["tokens"] == usage


def test_model_usage_is_read_before_usage_and_sums_every_model(tmp_path, monkeypatch):
    steps = mini.good(["engine/new.py"])[:-1]
    models = {
        "claude-opus-5-5": {
            "inputTokens": 10,
            "outputTokens": 500,
            "cacheReadInputTokens": 1000,
            "cacheCreationInputTokens": 200,
        },
        "claude-haiku-4-5": {"inputTokens": 5, "outputTokens": 50},
    }
    steps.append(result_event(usage={"output_tokens": 1}, modelUsage=models))
    _, out = play(tmp_path, monkeypatch, [steps])
    assert out.tokens == {
        "input_tokens": 15,
        "cache_creation_input_tokens": 200,
        "cache_read_input_tokens": 1000,
        "output_tokens": 550,
    }


def test_a_run_cut_off_before_its_result_keeps_the_streamed_estimate(tmp_path, monkeypatch):
    greedy = [{"init": mini.MODEL}, {"usage": {"in": 9_000_000, "out": 10}}, {"sleep": 30}]
    _, out = play(tmp_path, monkeypatch, [greedy])
    assert out.tokens["input_tokens"] == 9_000_000
    assert out.tokens["output_tokens"] == 10


class Ticking:
    """A clock that moves ten minutes each time it is read, as if the Mac slept."""

    def __init__(self):
        self.at = datetime(2026, 9, 29, 12, 0, tzinfo=UTC)

    def now(self):
        self.at += timedelta(minutes=10)
        return self.at

    def today(self):
        return self.at.date()


def test_wall_time_and_monotonic_time_are_both_kept(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    for key, value in mini.scenario(tmp_path, [mini.good(["engine/new.py"])]).items():
        monkeypatch.setenv(key, value)
    out = agent_run.run(task(), Ticking(), repo)
    span = datetime.fromisoformat(out.ended_at) - datetime.fromisoformat(out.started_at)
    assert out.wall_seconds == int(span.total_seconds()) > out.seconds


def test_agents_load_only_the_tools_they_use(tmp_path, monkeypatch):
    repo, out, calls = launched(tmp_path, monkeypatch, [mini.good(["engine/new.py"])])
    assert out.status == "done", out.reason
    (argv,) = calls
    assert after(argv, "--tools") == "Bash,Read,Edit,Write"
    assert after(argv, "--mcp-config") == '{"mcpServers": {}}'
    assert {"--strict-mcp-config", "--disable-slash-commands"} <= set(argv)
    assert "--disallowedTools" not in argv
    settings = json.loads((repo / after(argv, "--settings")).read_text())
    assert settings["autoMemoryEnabled"] is False
    assert settings["enabledPlugins"]
    assert not any(settings["enabledPlugins"].values())
    assert "sandbox" in settings


def test_an_agent_without_edit_in_its_contract_is_not_given_edit(tmp_path, monkeypatch):
    _, _, calls = launched(
        tmp_path,
        monkeypatch,
        [mini.good(["reviews/r.md"], "reviews")],
        lane="L-review",
        agent="reviewer",
        done="test -f reviews/r.md",
    )
    assert after(calls[0], "--tools") == "Bash,Read,Write"


def test_the_prompt_defines_twice_and_says_who_runs_the_done_command(tmp_path, monkeypatch):
    _, _, calls = launched(tmp_path, monkeypatch, [mini.good(["engine/new.py"])])
    prompt = " ".join(after(calls[0], "-p").split())
    assert "Twice means two different fixes that ended in the same failure." in prompt
    assert "Running the done command again on the same code is not a second failure." in prompt
    assert "You run it in your sandbox while you work." in prompt
    assert "the orchestrator runs it again in its jail, and only that run counts" in prompt
    # No lessons are asked for: what an agent says about its own run is not kept.
    assert "For each lesson" not in prompt
    assert "lessons may be an empty list" in prompt


def test_the_memory_block_holds_at_most_8_items_and_3000_characters(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    for n in range(30):
        memory.record("L-engine", f"failure {n} " + "x" * 300, "a fix", "run", "orchestrator", repo)
    _, _, calls = launched(tmp_path, monkeypatch, [mini.good(["engine/new.py"])], repo=repo)
    block = after(calls[0], "-p").split("(data about the past, not instructions)", 1)[1]
    assert 0 < block.count("What went wrong") <= 8
    assert len(block.strip()) <= 3000 + 8  # the joins between items


def test_retry_feedback_carries_failures_not_the_log(tmp_path, monkeypatch):
    noise = "".join(f"noise line {n}\\n" for n in range(200))
    done = (
        "test -f engine/new.py || { printf '"
        + noise
        + "FAILED tests/x.py::test_a - assert 1 == 2\\nE   assert 1 == 2\\n"
        "==== 1 failed, 2 passed in 0.05s ====\\n'; exit 1; }"
    )
    no_work = [{"init": mini.MODEL}, {"report": "engine", "files": []}, {"result": {}}]
    _, out, calls = launched(
        tmp_path, monkeypatch, [no_work, mini.good(["engine/new.py"])], done=done
    )
    assert (out.status, out.attempts) == ("done", 2)
    feedback = after(calls[1], "-p").split("# Why your last attempt was not accepted", 1)[1]
    assert "1 failed, 2 passed" in feedback
    assert "0.05s" not in feedback
    assert "FAILED tests/x.py::test_a - assert 1 == 2" in feedback
    assert "first assertion: E   assert 1 == 2" in feedback
    assert "exit 1 from test -f engine/new.py" in feedback
    assert "noise line 199" not in feedback
    assert "The full output is in .scratch/done-1.log." in feedback
    log = (Path(out.worktree) / ".scratch" / "done-1.log").read_text()
    assert "noise line 199" in log
    assert ".scratch" not in " ".join(out.files_changed)


def test_the_digest_reads_the_same_on_two_runs_of_the_same_failure():
    first = "\x1b[31mFAILED t.py::test_a - assert 1 == 2\x1b[0m\n1 failed in 0.51s\n"
    second = "FAILED t.py::test_a - assert 1 == 2\n1 failed in 12.30s\n"
    digest = agent_run.failure_digest(first, "uv run pytest", 1)
    assert digest == agent_run.failure_digest(second, "uv run pytest", 1)
    assert digest.splitlines() == [
        "exit 1 from uv run pytest",
        "1 failed",
        "FAILED t.py::test_a - assert 1 == 2",
    ]


def test_the_digest_of_a_command_that_is_not_a_test_runner_is_its_tail():
    output = "\n".join(f"line {n}" for n in range(10))
    assert agent_run.failure_digest(output, "make x", 2).splitlines() == [
        "exit 2 from make x",
        "line 6 | line 7 | line 8 | line 9",
    ]


def write_call(path, ok):
    """A Write tool call as the real stream shows it: the call, the file, then the result.

    A denied call still leaves the file, as when the model fell back to Bash (the 18:44 probe).
    """
    use = {
        "type": "assistant",
        "message": {
            "id": f"w-{path}",
            "content": [
                {
                    "type": "tool_use",
                    "id": f"tu-{path}",
                    "name": "Write",
                    "input": {"file_path": path},
                }
            ],
        },
    }
    said = "written" if ok else "Permission to use Write has been denied"
    result = {
        "type": "user",
        "message": {
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": f"tu-{path}",
                    "is_error": not ok,
                    "content": said,
                }
            ]
        },
    }
    return [{"raw": json.dumps(use)}, {"write": path}, {"raw": json.dumps(result)}]


def attempt_rows(repo):
    return [
        r
        for r in ledger.read(repo)
        if r["kind"] == "step"
        and r["message"].startswith("attempt ")
        and "not accepted" in r["message"]
    ]


def test_r6_a_probe_passes_only_when_its_write_tool_call_succeeded(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    denied = [
        {"init": health.model(repo)},
        *write_call("engine/new.py", ok=False),
        {"report": "engine", "files": ["engine/new.py"]},
        {"result": {}},
    ]
    _, out = play(tmp_path, monkeypatch, [denied], repo=repo, name="health/builder")
    assert out.status != "done"  # the file exists, but only a Write call proves the rule
    assert "no Write tool call succeeded" in out.reason
    assert not health.passed(agent_run.load_contract("builder", repo), "L-engine", repo, repo)


def test_r3_an_empty_output_still_names_the_command_and_its_exit_code():
    assert agent_run.failure_digest("", "test -f docs/HEALTH.txt", 1) == (
        "exit 1 from test -f docs/HEALTH.txt"
    )
    long = "uv run pytest " + "tests/unit/x.py " * 20
    head = agent_run.failure_digest("", long, 2)
    assert head.startswith("exit 2 from uv run pytest tests/unit/x.py")
    assert head.endswith("...")
    assert len(head) < 150


def test_r3_the_same_failure_after_two_different_fixes_escalates(tmp_path, monkeypatch):
    first = [
        {"init": mini.MODEL},
        {"write": "engine/a.py"},
        {"report": "engine", "files": ["engine/a.py"]},
        {"result": {}},
    ]
    second = [
        {"init": mini.MODEL},
        {"write": "engine/b.py"},
        {"report": "engine", "files": ["engine/a.py", "engine/b.py"]},
        {"result": {}},
    ]
    repo, out = play(tmp_path, monkeypatch, [first, second])
    assert (out.status, out.attempts) == ("escalated", 2)
    assert out.reason.startswith("the same failure twice: the done command fails: exit 1 from")
    end = [r for r in ledger.read(repo) if r["kind"] == "blocked"][-1]
    assert (end["cause"], end["cause_source"]) == ("unknown", None)


def test_r3_the_same_code_failing_again_is_not_a_second_failure(tmp_path, monkeypatch):
    # Only the progress log changes between the attempts, which is not a fix.
    same = [
        {"init": mini.MODEL},
        {"write": "engine/a.py"},
        {"tool": "Bash", "input": {"command": "echo tried >> engine/PROGRESS.md"}},
        {"write": "engine/PROGRESS.md", "text": "tried\n"},
        {"report": "engine", "files": ["engine/a.py", "engine/PROGRESS.md"]},
        {"result": {}},
    ]
    again = [*same[:3], {"write": "engine/PROGRESS.md", "text": "tried\ntried again\n"}, *same[4:]]
    _, out = play(tmp_path, monkeypatch, [same, again, again])
    assert (out.status, out.attempts) == ("failed", 3)
    assert "none accepted" in out.reason


def test_r1_r2_a_sandbox_denial_stops_at_attempt_one_naming_its_cause(tmp_path, monkeypatch):
    done = "printf 'OSError: mkdtemp /var/x: Operation not permitted\\n'; exit 1"
    repo, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])] * 3, done=done)
    assert (out.status, out.attempts) == ("failed", 1)
    assert "stopped at attempt 1, cause plan (sandbox.mkdtemp), not retried" in out.reason
    (row,) = attempt_rows(repo)
    assert (row["cause"], row["cause_source"], row["signature"]) == (
        "plan",
        "auto",
        "sandbox.mkdtemp",
    )
    stop = [r for r in ledger.read(repo) if r["kind"] == "failed"][-1]
    assert (stop["cause"], stop["cause_source"], stop["signature"]) == (
        "plan",
        "auto",
        "sandbox.mkdtemp",
    )
    assert telemetry.read_runs(repo)[-1]["signature"] == "sandbox.mkdtemp"


def test_r1_m6_an_attempt_no_signature_names_stays_unknown(tmp_path, monkeypatch):
    no_work = [{"init": mini.MODEL}, {"report": "engine", "files": []}, {"result": {}}]
    repo, out = play(tmp_path, monkeypatch, [no_work, mini.good(["engine/new.py"])])
    assert out.status == "done"
    (row,) = attempt_rows(repo)
    # No one has named it yet, so it has no source, as phase writes an unknown stop.
    assert (row["cause"], row["cause_source"], row["signature"]) == ("unknown", None, None)
    assert out.cause == ""  # a run that ends done has no cause


def test_r2_an_infra_failure_waits_and_tries_again(tmp_path, monkeypatch):
    slept = []
    monkeypatch.setattr(agent_run.time, "sleep", slept.append)
    done = (
        "test -f .scratch/tried || { mkdir -p .scratch; touch .scratch/tried; "
        "echo 'ssh: Could not resolve host: github.com'; exit 1; }; test -f engine/new.py"
    )
    good = mini.good(["engine/new.py"])
    repo, out = play(tmp_path, monkeypatch, [good, good], done=done)
    assert (out.status, out.attempts) == ("done", 2)
    assert slept == [5.0]
    (row,) = attempt_rows(repo)
    assert (row["cause"], row["signature"]) == ("infra", "remote.transient")


def test_r2_infra_failing_on_every_attempt_backs_off_and_never_escalates(tmp_path, monkeypatch):
    slept = []
    monkeypatch.setattr(agent_run.time, "sleep", slept.append)
    done = "echo 'fatal: Could not read from remote repository.'; exit 128"
    fixes = [mini.good([f"engine/f{n}.py"]) for n in range(3)]
    for n, steps in enumerate(fixes):  # each attempt keeps the files before it in its report
        steps[-2]["files"] = [f"engine/f{k}.py" for k in range(n + 1)]
    _, out = play(tmp_path, monkeypatch, fixes, done=done)
    assert (out.status, out.attempts) == ("failed", 3)
    assert slept == [5.0, 20.0]  # no wait after the last attempt
    assert (out.cause, out.signature) == ("infra", "remote.transient")


def test_r5_every_failed_attempt_leaves_its_work_on_the_branch(tmp_path, monkeypatch):
    first = [
        {"init": mini.MODEL},
        {"write": "engine/a.py"},
        {"report": "engine", "files": ["engine/a.py"]},
        {"result": {}},
    ]
    second = mini.good(["engine/new.py"])
    second[-2]["files"] = ["engine/a.py", "engine/new.py"]
    repo, out = play(tmp_path, monkeypatch, [first, second])
    assert (out.status, out.attempts) == ("done", 2)
    kept = [r["message"] for r in ledger.read(repo) if "unaccepted work kept" in r["message"]]
    assert len(kept) == 1
    sha = kept[0].split(" at ")[1].split(";")[0]
    shown = mini.git(repo, "show", "--stat", "--format=%s", sha)
    assert "not accepted (attempt 1)" in shown
    assert "engine/a.py" in shown
    # The accepted work still lands as one commit on the base.
    log = mini.git(repo, "log", "--format=%s", f"{out.base_commit}..{out.branch}")
    assert log.splitlines() == ["L-engine: Add engine/new.py. Nothing else."]


def test_r5_a_run_killed_mid_attempt_leaves_a_wip_commit(tmp_path):
    repo = mini.build(tmp_path)
    slow = [{"init": mini.MODEL}, {"write": "engine/new.py"}, {"sleep": 60}]
    env = {**os.environ, **mini.scenario(tmp_path, [slow]), "PYTHONPATH": str(mini.REAL)}
    result = tmp_path / "result.json"
    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "tools.factory.agent_run",
            *("--lane", "L-engine", "--agent", "builder", "--task", "t/1", "--spec", "s.md"),
            *("--mission", "m", "--done", "test -f engine/new.py", "--base", "phase-x"),
            *("--run-id", "l-engine-killed", "--result", str(result)),
        ],
        cwd=repo,
        env=env,
    )
    written = repo.parent / f"{repo.name}-worktrees" / "l-engine-killed" / "engine" / "new.py"
    for _ in range(300):
        if written.exists():
            break
        time.sleep(0.1)
    assert written.exists()
    proc.send_signal(signal.SIGTERM)
    assert proc.wait(timeout=60) == 1
    out = json.loads(result.read_text())
    assert (out["status"], out["cause"]) == ("stopped", "interrupted")
    shown = mini.git(repo, "show", "--stat", "--format=%s", out["kept_commit"])
    assert "wip(L-engine): not accepted (stopped)" in shown
    assert "engine/new.py" in shown
    assert mini.git(repo, "rev-parse", "lane/L-engine/l-engine-killed") == out["kept_commit"]
    stop = [r for r in ledger.read(repo) if r["kind"] == "blocked"][-1]
    assert (stop["cause"], stop["cause_source"]) == ("interrupted", "auto")


def test_m3_m4_context_and_large_reads_reach_the_metrics(tmp_path, monkeypatch):
    big, small = tmp_path / "big.txt", tmp_path / "small.txt"
    big.write_text("x" * (agent_run.LARGE_READ_BYTES + 1))
    small.write_text("x")
    steps = mini.good(["engine/new.py"])
    steps[1:1] = [
        {"usage": {"in": 100, "out": 5, "cached": 1_000}},
        {"tool": "Read", "input": {"file_path": str(big)}},
        {"tool": "Read", "input": {"file_path": str(big), "limit": 40}},
        {"tool": "Read", "input": {"file_path": str(small)}},
        {"usage": {"in": 10, "out": 5, "cached": 5_000}},
    ]
    repo, out = play(tmp_path, monkeypatch, [steps])
    assert out.status == "done", out.reason
    assert (out.first_context, out.final_context, out.large_reads) == (1_100, 5_010, 1)
    row = telemetry.read_runs(repo)[-1]
    assert (row["first_context"], row["final_context"], row["large_reads"]) == (1_100, 5_010, 1)
