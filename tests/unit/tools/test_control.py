"""The founder's controls that write to the ledger: handling an alert or a stop, and logging a
founder-lane workflow's tokens."""

import subprocess

from tests.support import mini_factory as mini
from tools.factory import control, efficiency, ledger


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
        done = subprocess.run(["make", "-n", *args], cwd=mini.REAL, capture_output=True, text=True)
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
