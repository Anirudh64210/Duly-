"""The founder's controls that write to the ledger: handling an alert or a stop, and logging a
founder-lane workflow's tokens."""

import subprocess

from tests.support import mini_factory as mini
from tools.factory import control, efficiency, ledger, registry, worktree


def last(repo):
    return ledger.read(repo)[-1]


def test_handling_a_stop_names_its_cause(tmp_path):
    repo = mini.build(tmp_path)
    stop = ledger.append(
        "founder", "orchestrator", "blocked", "gate 3", repo, plan="p", cause="unknown"
    )
    assert control.handled(repo, stop["hash"][:8], "fixed the gate", "infra") == 0
    row = last(repo)
    assert (row["handles"], row["cause"]) == (stop["hash"], "infra")
    assert "veto_upheld" not in row
    assert efficiency.plans([], [], ledger.read(repo))["p"].stops == {"infra": 1}


def test_an_agents_stop_is_handled_through_its_alert_and_counts_once(tmp_path):
    repo = mini.build(tmp_path)
    ledger.append("founder", "orchestrator", "start", "round A: L-api", repo)
    stop = ledger.append("L-api", "builder", "blocked", "x", repo, run_id="r-1", plan="p")
    alert = ledger.append("L-api", "orchestrator", "alert", "escalated: x", repo, run_id="r-1")
    ledger.append("founder", "orchestrator", "blocked", "round A stopped", repo, plan="p")
    assert control.handled(repo, stop["hash"][:8], "retried", "code") == 1  # listed as the alert
    assert control.handled(repo, alert["hash"][:8], "retried", "code") == 0
    # The agent's stop and the round's stop are one stop, with the cause named on the alert.
    assert efficiency.plans([], [], ledger.read(repo))["p"].stops == {"code": 1}


def test_a_vetos_cause_reaches_the_round_stop_that_followed_it(tmp_path):
    repo = mini.build(tmp_path)
    ledger.append("founder", "orchestrator", "start", "round R: L-review", repo)
    veto = ledger.append("L-review", "orchestrator", "alert", "veto: 1", repo, alert="veto")
    ledger.append("founder", "orchestrator", "blocked", "round R stopped", repo, plan="p")
    ledger.append("founder", "orchestrator", "start", "round R: L-review", repo)
    ledger.append("founder", "orchestrator", "blocked", "round R stopped", repo, plan="p")
    assert control.handled(repo, veto["hash"][:8], "the finding was right", "spec", "yes") == 0
    assert efficiency.plans([], [], ledger.read(repo))["p"].stops == {"spec": 1, "unknown": 1}


def test_a_veto_must_say_whether_it_was_upheld(tmp_path):
    repo = mini.build(tmp_path)
    veto = ledger.append("L-api", "orchestrator", "alert", "veto: 1", repo, alert="veto")
    other = ledger.append("L-api", "orchestrator", "alert", "stall: x", repo, alert="stall")
    assert control.handled(repo, veto["hash"][:8], "read it", "code") == 1
    assert control.handled(repo, other["hash"][:8], "read it", "", "yes") == 1
    assert control.handled(repo, veto["hash"][:8], "the finding was right", "code", "yes") == 0
    assert (last(repo)["veto_upheld"], last(repo)["cause"]) == (True, "code")
    assert control.handled(repo, veto["hash"][:8], "on second look", "", "no") == 0
    assert last(repo)["veto_upheld"] is False
    out = efficiency.report(ledger.read(repo))
    assert out.upheld == {True: 1, False: 1}
    assert "veto_upheld yes 1, no 1" in "\n".join(out.lines())


def test_a_workflows_tokens_are_logged_and_totalled_by_day(tmp_path):
    repo = mini.build(tmp_path)
    assert control.workflow(repo, "", 10) == 1
    assert control.workflow(repo, "review", 0) == 1
    assert control.workflow(repo, "review", 1_200_000) == 0
    assert control.workflow(repo, "research", 300_000) == 0
    row = last(repo)
    assert (row["kind"], row["lane"], row["workflow"], row["tokens"]) == (
        "cost",
        "founder",
        "research",
        300_000,
    )
    out = efficiency.report(ledger.read(repo))
    assert list(out.workflow_tokens.values()) == [1_500_000]
    assert "founder-lane workflows" in "\n".join(out.lines())
    assert ledger.verify(repo) == []


def test_make_offers_both_commands_and_the_runbook_names_them():
    def dry(*args: str) -> str:
        done = subprocess.run(
            ["make", "--no-print-directory", "-n", *args],
            cwd=mini.REAL,
            capture_output=True,
            text=True,
        )
        return done.stdout.strip()

    assert dry("handled", "ALERT=ab12", "CAUSE=spec", "UPHELD=yes", "NOTE=read it") == (
        'uv run python -m tools.factory.control handled --alert "ab12" --note "read it" '
        "--cause spec --upheld yes"
    )
    assert dry("workflow-tokens", "NAME=review", "TOKENS=1200") == (
        'uv run python -m tools.factory.control workflow --name "review" --tokens 1200'
    )
    runbook = (mini.REAL / "docs" / "factory" / "RUNBOOK.md").read_text()
    assert "`make handled ALERT=" in runbook
    assert "`make workflow-tokens NAME=" in runbook


def test_an_answer_records_when_it_was_asked_and_answered_and_by_which_way(tmp_path):
    repo = mini.build(tmp_path)
    stop = ledger.append("founder", "orchestrator", "blocked", "gate 3", repo, plan="p")
    assert control.handled(repo, stop["hash"][:8], "fixed", "infra", via="phone") == 1
    assert control.handled(repo, stop["hash"][:8], "fixed", "infra") == 0
    row = last(repo)
    assert (row["asked_at"], row["via"], row["cause_source"]) == (stop["at"], "cli", "human")
    assert row["answered_at"] >= row["asked_at"]
    assert control.handled(repo, stop["hash"][:8], "seen", via="card") == 0
    assert last(repo)["via"] == "card"
    assert "cause_source" not in last(repo)


def test_doctor_reports_ledger_commits_on_no_branch(tmp_path, capsys):
    repo = mini.build(tmp_path)
    kept = mini.git(repo, "rev-parse", "main")
    mini.git(repo, "checkout", "-q", "-b", "lane/L-engine/r-1")
    (repo / "engine" / "wip.py").write_text("VALUE = 1\n")
    mini.git(repo, "add", "-A")
    mini.git(repo, "commit", "-q", "-m", "wip")
    lost = mini.git(repo, "rev-parse", "HEAD")
    mini.git(repo, "checkout", "-q", "main")
    ledger.append("L-engine", "orchestrator", "merge", "merged", repo, head=kept)
    ledger.append(
        "L-engine", "orchestrator", "step", f"unaccepted work kept on x at {lost[:10]}", repo
    )
    assert control.lost_commits(repo) == []
    mini.git(repo, "branch", "-D", "lane/L-engine/r-1")
    assert [sha for sha, _ in control.lost_commits(repo)] == [lost[:10]]
    assert control.doctor(repo, "skill-curator") == 1
    assert f"LOST    commit {lost[:10]}" in capsys.readouterr().out


def test_a_cleanup_keeps_a_branch_holding_work_no_other_branch_holds(tmp_path):
    repo = mini.build(tmp_path)
    tree = worktree.create("r-1", "L-engine", "phase-x", repo)
    (tree.path / "engine" / "wip.py").write_text("VALUE = 1\n")
    kept = worktree.commit_all(tree, "wip", "builder")
    assert not worktree.remove(tree, True, repo)
    assert mini.git(repo, "rev-parse", tree.branch) == kept
    empty = worktree.create("r-2", "L-engine", "phase-x", repo)
    assert worktree.remove(empty, True, repo)
    assert mini.git(repo, "branch", "--list", empty.branch) == ""


def branch_with(repo, branch, *commits):
    """A branch off main holding one commit per list of files."""
    mini.git(repo, "checkout", "-q", "-b", branch, "main")
    for files in commits:
        for name in files:
            (repo / name).parent.mkdir(parents=True, exist_ok=True)
            (repo / name).write_text(f"{branch} {name}\n")
        mini.git(repo, "add", "-f", *files)
        mini.git(repo, "commit", "-q", "-m", f"{branch} {files}")
    mini.git(repo, "checkout", "-q", "main")


def test_r5_pruning_deletes_check_branches_and_never_one_with_unique_work(tmp_path, capsys):
    repo = mini.build(tmp_path)
    runs = {
        "l-engine-probe": ("health/builder/L-engine", [["engine/HEALTH.txt", "engine/probe.txt"]]),
        "l-engine-work": ("health/builder/L-engine", [["engine/HEALTH.txt"], ["engine/x.py"]]),
        "l-review-drift": ("drift/r-1", [["reviews/REVIEW.json"], ["reviews/drift.md"]]),
        "l-api-merged": ("golden/builder", [["api/y.py"]]),
        "l-api-plan": ("feature-x/A/L-api", [["api/HEALTH.txt"]]),  # work, not a check
        "l-api-empty": ("golden/tester", []),
    }
    for run, (task, commits) in runs.items():
        lane = run.rsplit("-", 1)[0].replace("l-", "L-")
        ledger.append(lane, "builder", "start", "go", repo, run_id=run, task=task)
        branch_with(repo, f"lane/{lane}/{run}", *commits)
    mini.git(repo, "branch", "keeper", "lane/L-api/l-api-merged")  # its commit is held elsewhere
    branch_with(repo, "golden/20260930-1/planted", ["engine/planted.py"])
    branch_with(repo, "golden/20260930-1/plain")
    branch_with(repo, "lane/founder/golden-setup-20260930-1-plain")
    held = worktree.create("l-engine-held", "L-engine", "main", repo)
    ledger.append("L-engine", "b", "start", "go", repo, run_id=held.run_id, task="health/b/x")
    registry.claim(held.run_id, "L-engine", "health/b/x", str(held.path), "", "builder", repo)

    assert control.clean(repo) == 0
    left = set(mini.git(repo, "for-each-ref", "--format=%(refname:short)", "refs/heads/").split())
    assert "5 check branches" in capsys.readouterr().out
    gone = {
        "lane/L-engine/l-engine-probe",
        "lane/L-api/l-api-merged",
        "lane/L-api/l-api-empty",
        "golden/20260930-1/plain",
        "lane/founder/golden-setup-20260930-1-plain",
    }
    assert not gone & left
    # Unique work other than a probe's files, plan work, and a checked out branch all stay.
    assert {
        "lane/L-engine/l-engine-work",
        "lane/L-review/l-review-drift",
        "lane/L-api/l-api-plan",
        "golden/20260930-1/planted",
        held.branch,
        "keeper",
    } <= left
    assert worktree.prune(repo) == []  # nothing further to delete
