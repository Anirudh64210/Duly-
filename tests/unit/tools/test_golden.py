"""R2 and L6: a golden task is tried once more when it fails, as a health probe is, its branch
goes only when it holds no work, and the judge's drift check runs with golden only on a model
change."""

import json

import yaml

from tests.support import mini_factory as mini
from tools.factory import agent_run, drift, golden, ledger


def golden_repo(tmp_path, *ids: str):
    repo = mini.build(tmp_path)
    tasks = [
        {"id": i, "lane": "L-engine", "agent": "builder", "mission": "m", "done": "true"}
        for i in ids
    ]
    (repo / "evals" / "factory").mkdir(parents=True)
    (repo / "evals" / "factory" / "golden.yaml").write_text(yaml.safe_dump({"tasks": tasks}))
    return repo


def fake_runs(monkeypatch, statuses):
    ran: list[str] = []
    it = iter(statuses)

    def run(task, clock, cwd):
        ran.append(task.task)
        status = next(it)
        return agent_run.Outcome(
            f"r-{len(ran)}", task.lane, task.agent, task.task, status=status, cost_usd=0.5
        )

    monkeypatch.setattr(golden.agent_run, "run", run)
    return ran


def test_r2_a_golden_task_that_passes_on_its_retry_is_a_flake(tmp_path, monkeypatch, capsys):
    repo = golden_repo(tmp_path, "first", "second")
    ran = fake_runs(monkeypatch, ["failed", "done", "done"])
    monkeypatch.setattr(golden.drift, "due", lambda repo: False)
    assert golden.main(cwd=repo) == 0
    assert ran == ["golden/first", "golden/first", "golden/second"]
    (row,) = [json.loads(x) for x in (repo / ".factory" / "golden.jsonl").read_text().splitlines()]
    first, second = row["results"]
    assert (first["passed"], first["flaked"], first["tries"], first["cost_usd"]) == (
        True,
        True,
        2,
        1.0,
    )
    assert (second["flaked"], second["tries"]) == (False, 1)
    (flake,) = [r for r in ledger.read(repo) if r.get("cause") == "flake"]
    assert (flake["signature"], flake["lane"]) == ("golden.first", "L-engine")
    assert "passed on its retry, recorded as a flake" in capsys.readouterr().out
    # The throwaway bases held no work, so the guarded removal took them.
    assert mini.git(repo, "branch", "--list", "golden/*") == ""


def test_r2_a_golden_task_failing_twice_fails_golden(tmp_path, monkeypatch):
    repo = golden_repo(tmp_path, "only")
    ran = fake_runs(monkeypatch, ["failed", "failed"])
    monkeypatch.setattr(golden.drift, "due", lambda repo: False)
    assert golden.main(cwd=repo) == 1
    assert len(ran) == 2
    assert not any(r.get("cause") == "flake" for r in ledger.read(repo))
    assert any(r.get("alert") == "eval_drop" for r in ledger.read(repo))


def test_l6_drift_runs_with_golden_only_when_the_model_changed(tmp_path, monkeypatch):
    repo = golden_repo(tmp_path, "only")
    fake_runs(monkeypatch, ["done", "done"])
    reviews = repo / ".factory" / "reviews.jsonl"
    reviews.parent.mkdir(exist_ok=True)
    assert drift.due(repo)  # never checked
    review = {"run_id": "r-0", "commit": "abc", "scores": {}, "decision": "APPROVE"}
    rescored = {**review, "run_id": "r-1", "rescored": "r-0", "model": "claude-older"}
    reviews.write_text(json.dumps(review) + "\n" + json.dumps(rescored) + "\n")
    assert drift.due(repo)  # the last check ran on another model
    judged: list[object] = []
    monkeypatch.setattr(golden.drift, "main", lambda cwd: judged.append(cwd) or 1)
    assert golden.main(cwd=repo) == 1  # golden passed; the judge drifted
    assert judged == [repo]
    with reviews.open("a") as handle:
        handle.write(json.dumps({**rescored, "run_id": "r-2", "model": mini.MODEL}) + "\n")
    assert not drift.due(repo)
    assert golden.main(cwd=repo) == 0
    assert judged == [repo]  # not run again on the same model
