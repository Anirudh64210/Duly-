"""R4 and M5: a run or a plan whose process is gone is reaped as interrupted, resume starts the
last parked or interrupted plan again from its round, and every stop names its stage."""

import json
import subprocess
import sys

import pytest

from tests.support import mini_factory as mini
from tools.factory import control, efficiency, jail, ledger, phase, registry

PLAN = {"name": "feature-x", "branch": "phase-x", "file": "specs/feature-x/plan.yaml"}


def dead_pid() -> int:
    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()
    return proc.pid


def test_the_reaper_marks_a_killed_run_and_leaves_a_live_one(tmp_path):
    repo = mini.build(tmp_path)
    killed = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
    alive = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
    try:
        for run, proc in (("l-engine-1", killed), ("l-api-2", alive)):
            registry.claim(run, run[:-2], f"feature-x/A/{run}", "", "", "builder", repo, proc.pid)
            ledger.append(run[:-2], "builder", "start", "go", repo, run_id=run, task="feature-x/A")
        ledger.append("l-web", "builder", "start", "go", repo, run_id="l-web-3", task="p/A/l")
        ledger.append("l-web", "builder", "done", "done", repo, run_id="l-web-3")
        killed.kill()
        killed.wait()
        assert phase.reap(repo) == ["l-engine-1"]
        row = ledger.read(repo)[-1]
        assert (row["kind"], row["run_id"], row["cause"], row["cause_source"], row["plan"]) == (
            "blocked",
            "l-engine-1",
            "interrupted",
            "auto",
            "feature-x",
        )
        assert phase.reap(repo) == []  # once only
    finally:
        alive.kill()
        alive.wait()


def test_r4_a_lost_claim_never_reaps_a_run_or_plan_whose_process_is_alive(tmp_path):
    repo = mini.build(tmp_path)
    me = phase.os.getpid()
    ledger.append("L-api", "builder", "start", "go", repo, run_id="l-api-1", task="x/A", pid=me)
    ledger.append("L-web", "builder", "start", "go", repo, run_id="l-web-2", pid=dead_pid())
    for bad in ("", "not a pid", -5, 0, 2**80):  # never signals a group or raises
        ledger.append("L-x", "builder", "start", "go", repo, run_id=f"l-x-{bad}", pid=bad)
    ledger.append("founder", "orchestrator", "start", "round A", repo, **phase._where(PLAN, "A"))
    assert registry.active(repo) == {}  # no run and no runner holds a claim
    reaped = phase.reap(repo)
    assert "l-api-1" not in reaped  # its pid is alive
    assert PLAN["file"] not in reaped
    assert reaped == ["l-web-2", *(f"l-x-{bad}" for bad in ("", "not a pid", -5, 0, 2**80))]


def test_a_plan_whose_runner_died_is_interrupted_and_resume_starts_it_again(
    tmp_path, monkeypatch, capsys
):
    repo = mini.build(tmp_path)
    where = {**phase._where(PLAN, "B"), "pid": dead_pid()}
    ledger.append("founder", "orchestrator", "start", "round B: L-engine", repo, **where)
    assert phase.reap(repo) == [PLAN["file"]]
    stop = ledger.read(repo)[-1]
    assert (stop["kind"], stop["round"], stop["cause"], stop["plan"]) == (
        "blocked",
        "B",
        "interrupted",
        "feature-x",
    )
    assert efficiency.plans([], [], ledger.read(repo))["feature-x"].stops == {"interrupted": 1}
    assert phase.parked(ledger.read(repo)) == (PLAN["file"], "B")

    started: list[list[str]] = []
    monkeypatch.setattr(control, "launch", lambda cmd, repo, log: started.append(cmd))
    registry.stop_file(repo).write_text("{}")
    assert control.resume(repo) == 0
    assert not registry.stopped(repo)
    assert started == [
        [sys.executable, "-m", "tools.factory.phase", PLAN["file"], "--from-round", "B"]
    ]
    assert "Resuming specs/feature-x/plan.yaml from round B" in capsys.readouterr().out


def test_resume_takes_the_last_parked_plan_and_none_once_it_closed(tmp_path):
    repo = mini.build(tmp_path)
    other = {**PLAN, "name": "feature-y", "file": "specs/feature-y/plan.yaml"}
    phase._stop(repo, PLAN, "round A stopped", round_name="A")
    phase._stop(repo, other, "round C stopped", round_name="C")
    assert phase.parked(ledger.read(repo)) == (other["file"], "C")
    ledger.append("founder", "orchestrator", "start", "round C", repo, **phase._where(other, "C"))
    ledger.append(
        "founder", "orchestrator", "done", "plan complete", repo, **phase._where(other), closed=True
    )
    assert phase.reap(repo) == []  # a closed plan is never interrupted
    assert phase.parked(ledger.read(repo)) == (PLAN["file"], "A")
    where = {**phase._where(PLAN, "A"), "pid": dead_pid()}
    ledger.append("founder", "orchestrator", "start", "round A", repo, **where)
    assert phase.reap(repo) == [PLAN["file"]]
    registry.claim(
        f"orchestrator-{phase.os.getpid()}", "orchestrator:phase-x", "o", "", "", "o", repo
    )
    ledger.append("founder", "orchestrator", "start", "round A", repo, **phase._where(PLAN, "A"))
    assert phase.reap(repo) == []  # its runner is alive
    assert phase.parked(ledger.read(repo)) is None


def test_resume_with_nothing_parked_only_allows_runs(tmp_path, monkeypatch, capsys):
    repo = mini.build(tmp_path)
    monkeypatch.setattr(control, "launch", lambda *a: pytest.fail("started"))
    assert control.resume(repo) == 0
    assert "No plan is parked or interrupted." in capsys.readouterr().out


def test_a_stop_records_its_stage_cause_source_and_signature(tmp_path):
    repo = mini.build(tmp_path)
    phase._stop(repo, PLAN, "stopped", "plan", "lane", "sandbox.mkdtemp", "A")
    row = ledger.read(repo)[-1]
    assert {k: row[k] for k in ("stage", "cause", "cause_source", "signature", "round")} == {
        "stage": "lane",
        "cause": "plan",
        "cause_source": "auto",
        "signature": "sandbox.mkdtemp",
        "round": "A",
    }
    phase._stop(repo, PLAN, "stopped", stage="checks", round_name="A")
    assert (ledger.read(repo)[-1]["cause"], ledger.read(repo)[-1]["cause_source"]) == (
        "unknown",
        None,
    )
    with pytest.raises(ValueError, match="unknown stage"):
        phase._stop(repo, PLAN, "stopped", stage="lunch")


def test_a_round_stop_is_classified_from_its_own_failures_only(tmp_path):
    repo = mini.build(tmp_path)
    ledger.append("l-x", "builder", "failed", "Operation not permitted", repo)  # an older round
    began = ledger.append("founder", "orchestrator", "start", "round A", repo)
    assert phase._cause(repo, began, "lane") == ("unknown", None)
    ledger.append("l-tests", "builder", "failed", "mkdtemp: Operation not permitted", repo)
    assert phase._cause(repo, began, "lane") == ("plan", "sandbox.mkdtemp")
    began = ledger.append("founder", "orchestrator", "start", "round B", repo)
    ledger.append("founder", "orchestrator", "alert", "failed: clean CI did not pass", repo)
    assert phase._cause(repo, began, "checks") == ("unknown", None)
    assert phase._cause(repo, began, "ci") == ("factory", "ci.red_local_green")


def test_a_check_that_passes_on_its_retry_is_a_flake_and_does_not_stop(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    codes = iter([1, 0, 1, 1])
    monkeypatch.setattr(
        phase, "_jailed", lambda repo, command: jail.Result(next(codes), "gitleaks: 1 leak", False)
    )
    assert phase.run_checks(repo, [{"name": "gitleaks", "run": "make gate-7"}])
    flake = ledger.read(repo)[-1]
    assert (flake["cause"], flake["signature"]) == ("flake", "check.gitleaks")
    assert not phase.run_checks(repo, [{"name": "gitleaks", "run": "make gate-7"}])
    results = json.loads((repo / ".factory" / "gates.json").read_text())["results"]
    assert results == {"gitleaks": "fail"}


def test_a_review_is_reused_only_while_nothing_but_reviews_changed(tmp_path):
    repo = mini.build(tmp_path)
    assert phase.reusable_review(repo) is None
    read = mini.git(repo, "rev-parse", "HEAD")
    review = {"reviewed_commit": read, "decision": "APPROVE"}
    (repo / "reviews" / "REVIEW.json").write_text(json.dumps(review))
    mini.git(repo, "add", "-A")
    mini.git(repo, "commit", "-q", "-m", "review")
    assert phase.reusable_review(repo) == review
    (repo / "engine" / "new.py").write_text("VALUE = 1\n")
    mini.git(repo, "add", "-A")
    mini.git(repo, "commit", "-q", "-m", "a fix")
    assert phase.reusable_review(repo) is None
    (repo / "reviews" / "REVIEW.json").write_text(json.dumps({**review, "reviewed_commit": "-x"}))
    assert phase.reusable_review(repo) is None


def test_the_scorecard_is_written_at_plan_close(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    ledger.append("founder", "orchestrator", "done", "plan complete", repo, plan="feature-x")
    path = phase.write_scorecard(repo, "feature-x")
    assert path == repo / ".factory" / "scorecards" / "feature-x.json"
    assert json.loads(path.read_text())["plan"] == "feature-x"

    def broken(plan: str, where: object, root: object) -> None:
        raise KeyError("runs")

    monkeypatch.setattr(phase.efficiency, "write_scorecard", broken)
    assert phase.write_scorecard(repo, "feature-y") is None
    assert "scorecard for feature-y not written" in ledger.read(repo)[-1]["message"]
