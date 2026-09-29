"""The factory's own behaviour, tested with a stand-in for the agent binary.

Covers the ordinary path and the chaos cases: a missing report, malformed output, a crash,
a hang, a loop, the wrong model, writes outside the lane, tampering with a protected
branch, the kill switch, a claim held by another run, and spent budgets.
"""

import json
import os
from datetime import UTC, datetime

import pytest

from engine.clocks import FixedClock
from tests.support import mini_factory as mini
from tools.factory import agent_run, jail, ledger, memory, registry, telemetry

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
    assert ledger.verify(repo) == []
    assert registry.active(repo) == {}
    assert telemetry.read_runs(repo)[0]["status"] == "done"
    trace = (repo / ".factory" / "otel" / "traces.jsonl").read_text()
    assert "gen_ai.agent.name" in trace


def test_hidden_tests_are_not_in_a_builders_worktree(tmp_path, monkeypatch):
    _, out = play(tmp_path, monkeypatch, [mini.good(["engine/new.py"])])
    from pathlib import Path

    assert not (Path(out.worktree) / "tests" / "holdout" / "test_hidden.py").exists()
    assert "test_hidden" not in " ".join(out.files_changed)


def test_the_orchestrator_runs_the_done_command_itself(tmp_path, monkeypatch):
    says_done = [{"init": mini.MODEL}, {"report": "engine", "files": []}, {"result": {"cost": 0.1}}]
    _, out = play(tmp_path, monkeypatch, [says_done, says_done])
    assert out.status == "escalated"
    assert "the done command fails" in out.reason


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
    assert out.status == "escalated"
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
    assert out.status == "escalated"
    assert "REPORT.json" in out.reason


def test_malformed_output_and_a_crash_are_survived(tmp_path, monkeypatch):
    crash = [{"raw": "{{{ not json"}, {"raw": ""}, {"exit": 3}]
    _, out = play(tmp_path, monkeypatch, [crash, mini.good(["engine/new.py"])])
    assert (out.status, out.attempts) == ("done", 2)


def test_a_hang_is_stopped_by_the_time_limit(tmp_path, monkeypatch):
    hang = [{"init": mini.MODEL}, {"tool": "Bash", "input": {"command": "x"}}, {"sleep": 30}]
    repo = mini.build(tmp_path, limits={"stall_minutes": 1000, "seconds_per_minute": 0.02})
    _, out = play(tmp_path, monkeypatch, [hang, hang], repo=repo)
    assert out.status == "escalated"
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
    assert out.status == "failed"
    assert "budget" in out.reason


def test_writes_outside_the_lane_are_never_accepted(tmp_path, monkeypatch):
    strays = [
        {"init": mini.MODEL},
        {"write": "engine/new.py"},
        {"write": "tests/cheat.py"},
        {"report": "engine", "files": ["engine/new.py", "tests/cheat.py"]},
        {"result": {}},
    ]
    _repo, out = play(tmp_path, monkeypatch, [strays, strays])
    assert out.status == "escalated"
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
    _, out = play(tmp_path, monkeypatch, [gives_up])
    assert (out.status, out.attempts) == ("escalated", 1)
    assert "contradicts the SPEC" in out.reason


def test_lessons_from_a_report_are_kept_once(tmp_path, monkeypatch):
    lesson = {
        "failure": "The done command was piped through tail and hid its exit code.",
        "fix": "Run it unpiped.",
        "evidence": "run log",
    }
    steps = mini.good(["engine/new.py"])
    steps[-2]["lessons"] = [lesson, lesson]
    repo, out = play(tmp_path, monkeypatch, [steps])
    assert out.status == "done"
    assert len(memory.read(repo)) == 1
    assert "piped through tail" in memory.for_prompt("L-engine", 40, 12000, repo)


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
