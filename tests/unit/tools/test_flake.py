"""R2: health probes, tamper checks and post-merge checks are tried once more when they fail. A
pass then is a flake with its signature, and the second flake of one signature is an alert."""

from engine.clocks import SystemClock
from tests.support import mini_factory as mini
from tools.factory import agent_run, control, health, ledger
from tools.factory.config import load_contract


def answers(*results: tuple[bool, str]):
    calls: list[int] = []
    it = iter(results)

    def check() -> tuple[bool, str]:
        calls.append(1)
        return next(it)

    return check, calls


def test_a_pass_needs_no_retry(tmp_path):
    repo = mini.build(tmp_path)
    check, calls = answers((True, "ok"))
    assert health.retry_once(check, "check.gates", repo) == health.Tried(True, "ok")
    assert len(calls) == 1
    assert ledger.read(repo) == []


def test_a_pass_on_the_retry_is_a_flake_and_the_second_one_alerts(tmp_path):
    repo = mini.build(tmp_path)
    check, calls = answers((False, "the done command fails:"), (True, "ok"))
    tried = health.retry_once(check, "health.auditor.l-audit", repo, "l-audit", "r-1")
    assert (tried.ok, tried.cause, tried.signature, tried.flaked) == (
        True,
        "flake",
        "health.auditor.l-audit",
        True,
    )
    assert len(calls) == 2
    row = ledger.read(repo)[-1]
    assert (row["kind"], row["lane"], row["run_id"], row["cause"], row["signature"]) == (
        "step",
        "l-audit",
        "r-1",
        "flake",
        "health.auditor.l-audit",
    )
    assert not any(r["kind"] == "alert" for r in ledger.read(repo))
    # Another signature is counted on its own.
    other, _ = answers((False, "x"), (True, "ok"))
    health.retry_once(other, "check.gitleaks", repo)
    assert not any(r["kind"] == "alert" for r in ledger.read(repo))
    again, _ = answers((False, "the done command fails:"), (True, "ok"))
    health.retry_once(again, "health.auditor.l-audit", repo, "l-audit", "r-2")
    alert = ledger.read(repo)[-1]
    assert (alert["kind"], alert["alert"]) == ("alert", "factory")  # a defect, not a failed run
    assert "factory defect: health.auditor.l-audit" in alert["message"]


def test_a_recognised_failure_names_the_signature_and_a_denial_is_never_retried(tmp_path):
    repo = mini.build(tmp_path)
    remote, _ = answers((False, "ssh: Connection reset by peer"), (True, "ok"))
    tried = health.retry_once(remote, "check.push", repo)
    assert (tried.ok, tried.signature) == (True, "remote.transient")
    denied, calls = answers((False, "fatal: .git/index.lock: Operation not permitted"))
    tried = health.retry_once(denied, "check.gates", repo)
    assert (tried.ok, tried.cause, tried.signature) == (False, "plan", "sandbox.index_lock")
    assert len(calls) == 1
    twice, calls = answers((False, "first"), (False, "second"))
    tried = health.retry_once(twice, "check.gates", repo)
    assert (tried.ok, tried.text, tried.cause, tried.flaked) == (False, "second", "unknown", False)
    assert len(calls) == 2


def test_doctor_runs_a_probe_again_once_and_records_the_flake(tmp_path, monkeypatch, capsys):
    repo = mini.build(tmp_path)
    auditor = load_contract("auditor", repo)
    lane = auditor.lanes[0]
    statuses = iter(["escalated", "done"])
    tasks: list[agent_run.Task] = []

    def run(task, clock, cwd):
        tasks.append(task)
        return agent_run.Outcome(
            f"r-{len(tasks)}",
            task.lane,
            task.agent,
            task.task,
            status=next(statuses),
            reason="probe",
        )

    monkeypatch.setattr(agent_run, "run", run)
    home = agent_run.home_of(control.load_lane(lane, repo))
    (repo / home).mkdir(parents=True, exist_ok=True)
    assert control.doctor(repo, "auditor") == 0
    assert [t.task for t in tasks] == [f"health/auditor/{lane}"] * 2
    assert tasks[0].done.startswith(f"test -f {home}/HEALTH.txt")
    assert f"ok      auditor in {lane}" in capsys.readouterr().out
    flake = [r for r in ledger.read(repo) if r.get("cause") == "flake"]
    assert [r["signature"] for r in flake] == [f"health.auditor.{lane}"]


def test_a_probe_that_fails_twice_fails_with_no_flake(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    builder = load_contract("builder", repo)
    runs: list[str] = []

    def run(task, clock, cwd):
        runs.append(task.task)
        return agent_run.Outcome("r", task.lane, task.agent, task.task, status="failed")

    monkeypatch.setattr(agent_run, "run", run)
    out = health.probe(builder, "L-engine", "engine", "main", SystemClock(), repo)
    assert out.status == "failed"
    assert runs == ["health/builder/L-engine"] * 2
    assert not any(r.get("cause") == "flake" for r in ledger.read(repo))
