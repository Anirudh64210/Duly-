"""The whole pipeline, end to end, with stand-in agents: a seed plan goes in, and a branch
comes out with every lane's work merged, checked again, and traceable to its run."""

import json
import os
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

import pytest
import yaml

from engine.clocks import FixedClock
from tests.support import mini_factory as mini
from tools.factory import agent_run, jail, ledger, phase, registry
from tools.factory.config import is_blocking, spec_point

pytestmark = pytest.mark.skipif(not jail.available(), reason="no sandbox on this machine")
CLOCK = FixedClock(datetime(2026, 9, 29, 12, 0, tzinfo=UTC))

REVIEW = {
    "run_id": "x",
    "reviewed_commit": "abcdef1",
    "findings": [],
    "decision": "APPROVE",
    "scores": {
        name: {"score": 5, "evidence": "Ran the inputs by hand and they held."}
        for name in (
            "correct",
            "sourced",
            "never_assumes",
            "inside_the_boundary",
            "secure",
            "tested",
        )
    },
}


def reviewer(review: dict) -> list[dict]:
    return [
        {"init": mini.MODEL},
        {"write": "reviews/phase.md", "text": "# Review\n\nAPPROVE\n"},
        {"write": "reviews/REVIEW.json", "text": json.dumps(review)},
        {"report": "reviews", "files": ["reviews/phase.md", "reviews/REVIEW.json"]},
        {"result": {"cost": 0.4}},
    ]


def plan_file(repo: Path, rounds: list[dict], name: str = "plan.yaml", **extra) -> Path:
    path = repo / name
    path.write_text(
        yaml.safe_dump(
            {
                "branch": "phase-x",
                "goal": "Land the phase.",
                "spec": "README.md",
                "merge": "local",
                "audited": False,
                "rounds": rounds,
                **extra,
            }
        )
    )
    mini.git(repo, "checkout", "-q", "phase-x")
    mini.git(repo, "add", name)
    mini.git(repo, "commit", "-q", "-m", "plan")
    return path


def orchestrate(
    repo: Path, env: dict[str, str], *args: str, plan: str = "plan.yaml"
) -> subprocess.CompletedProcess:
    full = {**os.environ, **env, "PYTHONPATH": str(mini.REAL)}
    return subprocess.run(
        [sys.executable, "-m", "tools.factory.phase", plan, *args],
        cwd=repo,
        env=full,
        capture_output=True,
        text=True,
        check=False,
    )


def job(lane: str, agent: str, done: str, **extra) -> dict:
    return {
        "lane": lane,
        "agent": agent,
        "mission": f"Do the work for {lane}.",
        "done": done,
        **extra,
    }


def test_a_seed_plan_becomes_a_checked_traceable_branch(tmp_path):
    repo = mini.build(tmp_path)
    env = mini.scenario(
        tmp_path,
        {
            "L-tests": [mini.good(["tests/test_new.py"], "tests", "def test_new():\n    pass\n")],
            "L-engine": [mini.good(["engine/new.py"])],
            "L-review": [reviewer(REVIEW)],
        },
    )
    plan_file(
        repo,
        [
            {
                "name": "A",
                "lanes": [
                    job("L-tests", "test-author", "test -f tests/test_new.py"),
                    job("L-engine", "builder", "test -f engine/new.py"),
                ],
                "checks": [
                    {"name": "both landed", "run": "test -f engine/new.py -a -f tests/test_new.py"}
                ],
            },
            {
                "name": "B",
                "lanes": [job("L-review", "reviewer", "test -f reviews/REVIEW.json")],
                "checks": [],
            },
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr
    assert "plan complete on phase-x" in done.stdout

    assert mini.git(repo, "rev-parse", "--abbrev-ref", "HEAD") == "phase-x"
    for name in ("engine/new.py", "tests/test_new.py", "reviews/phase.md"):
        assert (repo / name).exists()
    merges = mini.git(repo, "log", "--merges", "--format=%s%n%b")
    assert merges.count("Factory-Run: ") == 3
    assert "Factory-Trace: fake-session-1" in merges
    pinned = [
        line.split(": ")[1] for line in merges.splitlines() if line.startswith("Factory-Ledger")
    ]
    sealed = [row["hash"] for row in ledger.read(repo)]
    assert len(pinned) == 3
    assert all(seal in sealed for seal in pinned)
    assert mini.git(repo, "rev-parse", "main") != mini.git(repo, "rev-parse", "phase-x")
    assert "engine/new.py" not in mini.git(repo, "ls-tree", "-r", "--name-only", "main")

    assert mini.git(repo, "branch", "--list", "lane/*") == ""  # merged branches are removed
    assert list((tmp_path / "mini-worktrees").iterdir()) == []  # and so are their worktrees
    assert registry.active(repo) == {}
    assert ledger.verify(repo) == []
    gates = json.loads((repo / ".factory" / "gates.json").read_text())
    assert gates["results"] == {}
    scores = (repo / ".factory" / "reviews.jsonl").read_text()
    assert '"decision": "APPROVE"' in scores

    # One step undoes one lane: a merge commit is reverted as a unit.
    merge = mini.git(repo, "log", "--merges", "--format=%H", "--grep", "merge(L-engine)").split()[0]
    mini.git(repo, "revert", "-m", "1", "--no-edit", merge)
    assert not (repo / "engine" / "new.py").exists()
    assert (repo / "tests" / "test_new.py").exists()


def test_a_failed_lane_stops_the_round_and_the_rest_still_lands(tmp_path):
    repo = mini.build(tmp_path)
    broken = [{"init": mini.MODEL}, {"report": "engine", "files": []}, {"result": {}}]
    env = mini.scenario(
        tmp_path,
        {
            "L-tests": [mini.good(["tests/test_new.py"], "tests")],
            "L-engine": [broken, broken],
        },
    )
    plan_file(
        repo,
        [
            {
                "name": "A",
                "lanes": [
                    job("L-tests", "test-author", "test -f tests/test_new.py"),
                    job("L-engine", "builder", "test -f engine/new.py"),
                ],
                "checks": [{"name": "engine", "run": "test -f engine/new.py"}],
            }
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 1
    assert "rerun with --from-round A" in done.stdout
    assert (repo / "tests" / "test_new.py").exists()
    assert not (repo / "engine" / "new.py").exists()
    assert "check engine fails" not in done.stdout  # no checks after a failed round
    stops = [r for r in ledger.read(repo) if r["kind"] == "blocked" and r["lane"] == "founder"]
    assert [(row["plan"], row["cause"], row["stage"]) for row in stops] == [
        ("phase-x", "unknown", "lane")
    ]

    # The founder fixes the plan and commits it. Run again: only L-engine runs, since L-tests
    # landed after the plan's first round started, and it has no attempts left here.
    plan = repo / "plan.yaml"
    plan.write_text(plan.read_text().replace("name: engine", "name: engine landed"))
    mini.git(repo, "commit", "-q", "-am", "fix the plan")
    env = mini.scenario(tmp_path, {"L-engine": [mini.good(["engine/new.py"])]})
    again = orchestrate(repo, env, "--from-round", "A")
    assert again.returncode == 0, again.stdout + again.stderr
    assert "already on the branch, not run again: L-tests" in again.stdout
    merges = mini.git(repo, "log", "--merges", "--format=%s")
    assert merges.count("merge(L-tests)") == 1
    assert merges.count("merge(L-engine)") == 1


def test_a_task_landed_by_an_earlier_plan_is_run_again(tmp_path):
    repo = mini.build(tmp_path)
    env = mini.scenario(tmp_path, {"L-tests": [mini.good(["tests/test_new.py"], "tests")]})
    rounds = [{"name": "A", "lanes": [job("L-tests", "test-author", "test -f tests/test_new.py")]}]
    plan_file(repo, rounds)
    assert orchestrate(repo, env).returncode == 0
    # A second plan file on the same branch uses the same task name.
    rounds[0]["lanes"][0]["done"] = "test -f tests/test_other.py"
    env = mini.scenario(tmp_path, {"L-tests": [mini.good(["tests/test_other.py"], "tests")]})
    plan_file(repo, rounds, "plan-2.yaml", goal="Land it again.")
    done = orchestrate(repo, env, "--from-round", "A", plan="plan-2.yaml")
    assert done.returncode == 0, done.stdout + done.stderr
    assert "not run again" not in done.stdout
    assert (repo / "tests" / "test_other.py").exists()


def test_a_failing_check_stops_the_plan(tmp_path):
    repo = mini.build(tmp_path)
    env = mini.scenario(tmp_path, {"L-engine": [mini.good(["engine/new.py"])]})
    plan_file(
        repo,
        [
            {
                "name": "A",
                "lanes": [job("L-engine", "builder", "test -f engine/new.py")],
                "checks": [{"name": "never", "run": "false"}],
            },
            {"name": "B", "lanes": [job("L-tests", "test-author", "true")], "checks": []},
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 1
    assert "round B" not in done.stdout
    assert json.loads((repo / ".factory" / "gates.json").read_text())["results"] == {
        "never": "fail"
    }
    again = orchestrate(repo, env, "--from-round", "A", "--checks-only", "A")
    assert "check never fails" in again.stdout
    stops = [r for r in ledger.read(repo) if r["kind"] == "blocked" and r["lane"] == "founder"]
    assert [(r["stage"], r["round"], r["plan_file"]) for r in stops] == [
        ("checks", "A", "plan.yaml")
    ] * 2


def test_a_veto_stops_the_plan(tmp_path):
    repo = mini.build(tmp_path)
    veto = {
        **REVIEW,
        "decision": "VETO",
        "findings": [
            {
                "severity": "blocking",
                "title": "Quiet verdict on a gap",
                "file": "engine/f1.py",
                "input": "stem without opt",
                "what_happens": "no_open_items, against point 3",
                "kind": "boundary",
            },
            {
                "severity": "should_fix",
                "title": "A long name",
                "file": "engine/f1.py",
                "input": "any",
                "what_happens": "reads badly",
            },
        ],
    }
    env = mini.scenario(tmp_path, {"L-review": [reviewer(veto)]})
    plan_file(
        repo,
        [
            {
                "name": "R",
                "lanes": [job("L-review", "reviewer", "test -f reviews/REVIEW.json")],
                "checks": [{"name": "never", "run": "false"}],
            }
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 1
    rows = ledger.read(repo)
    assert any(row.get("alert") == "veto" for row in rows), done.stdout + done.stderr
    assert not any(row.get("alert") == "eval_drop" for row in rows)
    assert "check never fails" not in done.stdout  # no checks after a vetoed round
    found = [json.loads(line) for line in (repo / ".factory" / "findings.jsonl").open()]
    assert [(f["kind"], f["severity"], f["blocking"], f["spec_point"]) for f in found] == [
        ("boundary", "blocking", True, "3"),
        ("other", "should_fix", False, ""),
    ]
    assert {"id", "kind", "file", "input", "blocking", "spec_point", "plan"} <= set(found[0])
    assert found[0]["id"].endswith("-1")
    assert found[0]["plan"] == "phase-x"
    review = json.loads((repo / ".factory" / "reviews.jsonl").read_text())
    assert (review["decision"], review["plan"]) == ("VETO", "phase-x")
    assert rows[-1]["stage"] == "review"


def test_a_sandbox_denial_names_its_cause_at_the_stop(tmp_path):
    repo = mini.build(tmp_path)
    env = mini.scenario(tmp_path, {"L-engine": [mini.good(["engine/new.py"])] * 3})
    denied = "echo 'mkdtemp: /tmp/x: Operation not permitted' >&2; false"
    plan_file(repo, [{"name": "A", "lanes": [job("L-engine", "builder", denied)]}])
    done = orchestrate(repo, env)
    assert done.returncode == 1
    stop = [r for r in ledger.read(repo) if r["kind"] == "blocked" and r["lane"] == "founder"]
    assert [(r["cause"], r["cause_source"], r["signature"], r["stage"]) for r in stop] == [
        ("plan", "auto", "sandbox.mkdtemp", "lane")
    ]


def test_a_resumed_plan_reuses_the_review_of_the_code_as_it_is(tmp_path):
    repo = mini.build(tmp_path)
    gate = tmp_path / "gate-open"
    rounds = [
        {
            "name": "R",
            "lanes": [job("L-review", "reviewer", "test -f reviews/REVIEW.json")],
            "checks": [{"name": "gate", "run": f"test -f {gate}"}],
        }
    ]
    plan_file(repo, rounds)
    review = {**REVIEW, "reviewed_commit": mini.git(repo, "rev-parse", "HEAD")}
    env = mini.scenario(tmp_path, {"L-review": [reviewer(review)]})
    done = orchestrate(repo, env)
    assert done.returncode == 1
    assert phase.parked(ledger.read(repo)) == ("plan.yaml", "R")
    gate.write_text("")
    env = mini.scenario(tmp_path, {"L-review": []})  # a second review would fail
    again = orchestrate(repo, env, "--from-round", "R")
    assert again.returncode == 0, again.stdout + again.stderr
    assert f"review of {review['reviewed_commit']} reused: APPROVE" in again.stdout
    assert phase.parked(ledger.read(repo)) is None


def test_a_blocking_finding_with_no_spec_point_is_refused_and_still_kept(tmp_path):
    repo = mini.build(tmp_path)
    veto = {
        **REVIEW,
        "decision": "VETO",
        "findings": [
            {
                "severity": "blocking",
                "title": "More tests would help",
                "file": "engine/f1.py",
                "input": "any",
                "what_happens": "only two cases",
            }
        ],
    }
    env = mini.scenario(tmp_path, {"L-review": [reviewer(veto)]})
    plan_file(
        repo,
        [{"name": "R", "lanes": [job("L-review", "reviewer", "test -f reviews/REVIEW.json")]}],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 1
    rows = ledger.read(repo)
    assert any("must name the SPEC point" in row["message"] for row in rows)
    assert not any(row.get("alert") == "veto" for row in rows)
    assert not (repo / ".factory" / "reviews.jsonl").exists()  # a refused veto is no veto
    found = json.loads((repo / ".factory" / "findings.jsonl").read_text())
    assert (found["severity"], found["blocking"]) == ("blocking", False)


@pytest.mark.parametrize(
    ("finding", "blocking", "point"),
    [
        ({"what_happens": "breaks point 22b"}, True, "22b"),
        ({"title": "SPEC 5 is not met"}, True, "5"),
        ({"what_happens": "crosses a BOUNDARY rule"}, True, ""),
        ({"what_happens": "8 CFR 214.2(f)(10) says twelve months"}, True, ""),
        ({"what_happens": "INA 245(k) is misread"}, True, ""),
        ({"what_happens": "see https://www.uscis.gov/x"}, True, ""),
        ({"what_happens": "the copy is long", "spec_point": "7"}, True, "7"),
        ({"what_happens": "the copy is long"}, False, ""),
        ({"what_happens": "breaks point 22", "severity": "should_fix"}, False, "22"),
    ],
)
def test_a_finding_blocks_only_when_it_names_a_point_a_rule_or_a_source(finding, blocking, point):
    finding = {"severity": "blocking", "title": "", **finding}
    assert is_blocking(finding) is blocking
    assert spec_point(finding) == point


def test_each_agent_is_told_its_plan(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    plan = phase.load_plan(
        plan_file(repo, [{"name": "A", "lanes": [job("L-a", "builder", "true")]}]), repo
    )
    seen: list[dict[str, str]] = []
    real = subprocess.Popen

    def spy(cmd, **kwargs):
        if "tools.factory.agent_run" in cmd:  # the agent itself is not run
            seen.append(kwargs["env"])
            cmd = ["true"]
        return real(cmd, **kwargs)

    monkeypatch.setattr(subprocess, "Popen", spy)
    assert not phase.run_round(repo, plan, plan["rounds"][0], skip_agents=False)
    assert [env["DULY_PLAN"] for env in seen] == [plan["name"]] == ["phase-x"]


def test_a_review_that_approves_against_its_own_scores_is_refused(tmp_path):
    repo = mini.build(tmp_path)
    soft = json.loads(json.dumps(REVIEW))
    soft["scores"]["sourced"]["score"] = 2
    env = mini.scenario(tmp_path, {"L-review": [reviewer(soft)]})
    plan_file(
        repo,
        [
            {
                "name": "R",
                "lanes": [job("L-review", "reviewer", "test -f reviews/REVIEW.json")],
                "checks": [],
            }
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 1
    assert any("call for a veto" in row["message"] for row in ledger.read(repo))


def test_work_kept_for_the_founder_is_not_merged(tmp_path):
    repo = mini.build(tmp_path)
    rule = "security/semgrep/new-rule.yaml"
    env = mini.scenario(
        tmp_path,
        {"L-security": [mini.good([rule], "security", "rules: []\n")]},
    )
    plan_file(
        repo,
        [
            {
                "name": "K",
                "lanes": [job("L-security", "red-team", f"test -f {rule}")],
                "checks": [],
            }
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr
    assert "waiting for the founder (guardrail_changed)" in done.stdout
    # Held work is not a stop: it has its own kind, and the plan went on.
    kinds = [r["kind"] for r in ledger.read(repo) if r["lane"] == "founder"]
    assert "held" in kinds
    assert "blocked" not in kinds
    assert not (repo / rule).exists()
    assert "lane/L-security/" in mini.git(repo, "branch", "--list", "lane/*")


def test_a_merge_conflict_is_reported_and_leaves_the_branch_clean(tmp_path, monkeypatch):
    repo = mini.build(tmp_path)
    for key, value in mini.scenario(
        tmp_path, [mini.good(["engine/new.py"], text="A = None\n")]
    ).items():
        monkeypatch.setenv(key, value)
    mini.git(repo, "checkout", "-q", "phase-x")
    out = agent_run.run(
        agent_run.Task(
            "L-engine",
            "builder",
            "t/1",
            "s",
            "Add engine/new.py.",
            "test -f engine/new.py",
            "phase-x",
        ),
        CLOCK,
        repo,
    )
    assert out.status == "done"
    (repo / "engine" / "new.py").write_text("B = None\n")
    mini.git(repo, "add", "-A")
    mini.git(repo, "commit", "-q", "-m", "the founder got there first")
    before = mini.git(repo, "rev-parse", "HEAD")
    from dataclasses import asdict

    landed = phase.land(repo, {"branch": "phase-x", "merge": "local"}, {"task": "t/1"}, asdict(out))
    assert landed is False
    assert mini.git(repo, "rev-parse", "HEAD") == before
    assert mini.git(repo, "status", "--porcelain", "--untracked-files=no") == ""
    assert any("merge conflict" in row["message"] for row in ledger.read(repo))


@pytest.mark.parametrize(
    ("change", "problem"),
    [
        ({"branch": "main"}, "protected"),
        ({"merge": "squash"}, "local or pr"),
        (
            {
                "rounds": [
                    {
                        "name": "A",
                        "lanes": [
                            {"lane": "L-web", "agent": "builder", "mission": "x", "done": "true"},
                            {"lane": "L-web", "agent": "builder", "mission": "x", "done": "true"},
                        ],
                    }
                ]
            },
            "twice",
        ),
        (
            {
                "rounds": [
                    {
                        "name": "A",
                        "lanes": [
                            {"lane": "L-web", "agent": "builder", "mission": "", "done": "true"}
                        ],
                    }
                ]
            },
            "no mission",
        ),
        (
            {
                "rounds": [
                    {
                        "name": "A",
                        "lanes": [
                            {"lane": f"L-{i}", "agent": "builder", "mission": "x", "done": "true"}
                            for i in range(9)
                        ],
                    }
                ]
            },
            "more agents than",
        ),
    ],
)
def test_a_bad_plan_is_refused(tmp_path, change, problem):
    repo = mini.build(tmp_path)
    plan = {"branch": "phase-x", "spec": "README.md", "audited": False, "rounds": [], **change}
    path = tmp_path / "p.yaml"
    path.write_text(yaml.safe_dump(plan))
    with pytest.raises(phase.PlanError, match=problem):
        phase.load_plan(path, repo)


def test_two_orchestrators_cannot_share_a_branch(tmp_path):
    repo = mini.build(tmp_path)
    plan_file(repo, [])
    registry.claim(
        "orchestrator-1",
        "orchestrator:phase-x",
        "orchestrate:phase-x",
        "",
        "",
        "orchestrator",
        repo,
        pid=os.getpid(),
    )
    # The stand-in agent, so the claim is what refuses and not the login check: CI runs
    # on a machine with no Claude login.
    done = orchestrate(repo, {"DULY_NO_NOTIFY": "1", **mini.scenario(tmp_path, [])})
    assert done.returncode == 1
    assert "already claimed" in done.stdout


def test_changes_that_need_the_founder_are_named():
    found = phase.needs_founder(
        [
            "pyproject.toml",
            "engine/f1.py",
            ".github/workflows/ci.yml",
            ".claude/hooks/guard_bash.py",
            ".claude/skills/add-eval-case/SKILL.md",
            "contracts/openapi.yaml",
        ]
    )
    assert set(found) == {
        "dependency_added",
        "ci_or_infra_changed",
        "guardrail_changed",
        "skill_or_prompt_changed",
        "contract_changed",
    }
    assert phase.needs_founder(["engine/f1.py", "web/src/App.tsx"]) == {}


def with_remote(tmp_path: Path, repo: Path, ci: str = "pass") -> dict[str, str]:
    """A bare remote and a stand-in for the GitHub command line on the PATH."""
    remote = tmp_path / "origin.git"
    subprocess.run(["git", "init", "-q", "--bare", "-b", "main", str(remote)], check=True)
    mini.git(repo, "remote", "add", "origin", str(remote))
    mini.git(repo, "push", "-q", "origin", "main")
    tools = tmp_path / "bin"
    tools.mkdir()
    gh = tools / "gh"
    gh.write_text(
        f'#!/bin/sh\nexec "{sys.executable}" "{mini.REAL}/tests/support/fake_gh.py" "$@"\n'
    )
    gh.chmod(0o755)
    return {
        "PATH": f"{tools}:{os.environ['PATH']}",
        "FAKE_GH_STATE": str(tmp_path / "gh.json"),
        "FAKE_GH_CI": ci,
        "DULY_CI_POLL_SECONDS": "0",
    }


def pr_plan(repo: Path) -> None:
    plan_file(
        repo,
        [
            {
                "name": "A",
                "checkpoint": False,
                "checks": [],
                "lanes": [job("L-tests", "test-author", "test -f tests/test_new.py")],
            },
            {
                "name": "B",
                "checks": [{"name": "landed", "run": "test -f engine/new.py"}],
                # The second round must start from what the first round landed.
                "lanes": [
                    job("L-engine", "builder", "test -f engine/new.py -a -f tests/test_new.py")
                ],
            },
        ],
        merge="pr",
    )


def test_work_reaches_the_phase_branch_only_through_a_pull_request_that_ci_passed(tmp_path):
    repo = mini.build(tmp_path)
    env = {
        **mini.scenario(
            tmp_path,
            {
                "L-tests": [mini.good(["tests/test_new.py"], "tests")],
                "L-engine": [mini.good(["engine/new.py"])],
            },
        ),
        **with_remote(tmp_path, repo),
    }
    pr_plan(repo)
    before = mini.git(repo, "rev-parse", "phase-x")
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr

    prs = json.loads((tmp_path / "gh.json").read_text())["prs"]
    assert [(p["base"], p["head"], p["state"]) for p in prs] == [
        ("phase-x", "work/phase-x", "merged")
    ]
    assert prs[0]["title"] == "phase-x: round B"  # round A travelled with round B
    assert "merge(L-tests)" in prs[0]["body"]
    assert "merge(L-engine)" in prs[0]["body"]
    assert "Generated with [Claude Code]" in prs[0]["body"]

    assert mini.git(repo, "rev-parse", "--abbrev-ref", "HEAD") == "work/phase-x"
    assert mini.git(repo, "rev-parse", "phase-x") != before
    assert mini.git(repo, "rev-parse", "phase-x") == mini.git(repo, "rev-parse", "origin/phase-x")
    assert mini.git(repo, "rev-parse", "work/phase-x") == mini.git(repo, "rev-parse", "phase-x")
    files = mini.git(repo, "ls-tree", "-r", "--name-only", "phase-x")
    assert "engine/new.py" in files
    assert "tests/test_new.py" in files
    assert "engine/new.py" not in mini.git(repo, "ls-tree", "-r", "--name-only", "origin/main")


def test_nothing_reaches_the_phase_branch_when_ci_fails(tmp_path):
    repo = mini.build(tmp_path)
    env = {
        **mini.scenario(
            tmp_path,
            {
                "L-tests": [mini.good(["tests/test_new.py"], "tests")],
                "L-engine": [mini.good(["engine/new.py"])],
            },
        ),
        **with_remote(tmp_path, repo, ci="fail"),
    }
    pr_plan(repo)
    before = mini.git(repo, "rev-parse", "phase-x")
    done = orchestrate(repo, env)
    assert done.returncode == 1
    assert mini.git(repo, "rev-parse", "phase-x") == before
    assert any("clean CI did not pass" in row["message"] for row in ledger.read(repo))
    assert (repo / "engine" / "new.py").exists()  # the work waits on the working branch


def test_a_plan_reaches_the_phase_branch_once_at_its_last_round(tmp_path):
    repo = mini.build(tmp_path)
    env = {
        **mini.scenario(
            tmp_path,
            {
                "L-tests": [mini.good(["tests/test_new.py"], "tests")],
                "L-engine": [mini.good(["engine/new.py"])],
                "L-web": [mini.good(["web/new.ts"], "web")],
            },
        ),
        **with_remote(tmp_path, repo),
    }
    plan_file(
        repo,
        [
            {
                "name": "A",
                "checks": [],
                "lanes": [job("L-tests", "test-author", "test -f tests/test_new.py")],
            },
            {
                "name": "B",
                "checks": [],
                "lanes": [job("L-engine", "builder", "test -f engine/new.py")],
            },
            {"name": "C", "checks": [], "lanes": [job("L-web", "builder", "test -f web/new.ts")]},
        ],
        merge="pr",
    )
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr
    prs = json.loads((tmp_path / "gh.json").read_text())["prs"]
    assert [(p["title"], p["state"]) for p in prs] == [("phase-x: round C", "merged")]
    assert "merge(L-tests)" in prs[0]["body"]
    assert "merge(L-engine)" in prs[0]["body"]


def test_a_round_run_again_reuses_its_open_pull_request(tmp_path):
    repo = mini.build(tmp_path)
    env = {
        **mini.scenario(
            tmp_path,
            {
                "L-tests": [mini.good(["tests/test_new.py"], "tests")],
                "L-engine": [mini.good(["engine/new.py"])],
            },
        ),
        **with_remote(tmp_path, repo),
    }
    # The first attempt at the round left its pull request open.
    (tmp_path / "gh.json").write_text(
        json.dumps(
            {
                "prs": [
                    {
                        "base": "phase-x",
                        "head": "work/phase-x",
                        "title": "phase-x: round B",
                        "body": "first attempt",
                        "state": "open",
                    }
                ]
            }
        )
    )
    pr_plan(repo)
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr
    prs = json.loads((tmp_path / "gh.json").read_text())["prs"]
    assert [(p["head"], p["state"]) for p in prs] == [("work/phase-x", "merged")]
    assert prs[0]["edits"] == 1
    assert "merge(L-engine)" in prs[0]["body"]


def test_checks_left_from_an_earlier_commit_are_never_read_as_the_new_ones(tmp_path):
    repo = mini.build(tmp_path)
    env = {
        **mini.scenario(
            tmp_path,
            {
                "L-tests": [mini.good(["tests/test_new.py"], "tests")],
                "L-engine": [mini.good(["engine/new.py"])],
            },
        ),
        **with_remote(tmp_path, repo),
        "FAKE_GH_STALE": "3",  # three views still show the earlier head, with a failed check
    }
    pr_plan(repo)
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr
    state = json.loads((tmp_path / "gh.json").read_text())
    assert state["views"] == 4
    assert state["prs"][0]["state"] == "merged"


def test_the_check_states_of_github_are_read_right():
    run = {"__typename": "CheckRun", "status": "COMPLETED"}
    assert phase._check_state({**run, "conclusion": "SUCCESS"}) == "passed"
    assert phase._check_state({**run, "conclusion": "SKIPPED"}) == "passed"
    assert phase._check_state({**run, "conclusion": "FAILURE"}) == "failed"
    assert phase._check_state({**run, "conclusion": "CANCELLED"}) == "failed"
    assert phase._check_state({"__typename": "CheckRun", "status": "IN_PROGRESS"}) == "pending"
    status = {"__typename": "StatusContext"}
    assert phase._check_state({**status, "state": "PENDING"}) == "pending"
    assert phase._check_state({**status, "state": "SUCCESS"}) == "passed"
    assert phase._check_state({**status, "state": "ERROR"}) == "failed"


def test_a_plan_must_end_with_an_audit(tmp_path):
    repo = mini.build(tmp_path)
    rounds = [{"name": "A", "lanes": [job("L-engine", "builder", "true")]}]
    path = tmp_path / "p.yaml"
    path.write_text(yaml.safe_dump({"branch": "phase-x", "spec": "README.md", "rounds": rounds}))
    with pytest.raises(phase.PlanError, match="no audit"):
        phase.load_plan(path, repo)
    rounds.append({"name": "Z", "lanes": [job("L-audit", "auditor", "true")]})
    path.write_text(yaml.safe_dump({"branch": "phase-x", "spec": "README.md", "rounds": rounds}))
    assert phase.load_plan(path, repo)["rounds"][-1]["name"] == "Z"


def test_a_remote_step_is_tried_again_only_while_it_fails_transiently(monkeypatch):
    monkeypatch.setenv("DULY_RETRY_SECONDS", "0,0,0")
    denied = (128, "git@github.com: Permission denied (publickey).")

    def replies(*answers):
        calls = []

        def call():
            calls.append(1)
            return answers[min(len(calls), len(answers)) - 1]

        return call, calls

    call, calls = replies(denied, (0, "pushed"))
    assert phase._remote(call) == (0, "pushed")
    assert len(calls) == 2

    call, calls = replies((1, "! [rejected] stale info"))  # not transient: reported at once
    assert phase._remote(call) == (1, "! [rejected] stale info")
    assert len(calls) == 1

    call, calls = replies(denied)  # still refused after every wait: reported
    assert phase._remote(call) == denied
    assert len(calls) == 4


def test_a_step_runs_with_no_agent_and_its_work_is_committed(tmp_path):
    repo = mini.build(tmp_path)
    (repo / "notes.txt").write_text("the founder's own, untracked\n")
    env = mini.scenario(tmp_path, {"L-tests": [mini.good(["tests/test_new.py"], "tests")]})
    plan_file(
        repo,
        [
            {
                "name": "A",
                "steps": [{"lane": "L-engine", "run": "echo 'V = 1' > engine/made.py"}],
                # The lane starts from what the step committed.
                "lanes": [job("L-tests", "test-author", "test -f engine/made.py")],
            }
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr
    step = mini.git(repo, "log", "--format=%B", "--grep", "step(L-engine)")
    assert "Factory-Task: phase-x/A/L-engine" in step
    assert "Factory-Command: echo" in step
    assert mini.git(repo, "show", "--name-only", "--format=", "HEAD^2") == "tests/test_new.py"
    committed = mini.git(repo, "ls-tree", "-r", "--name-only", "HEAD")
    assert "engine/made.py" in committed
    assert "notes.txt" not in committed  # what was there before the step is not its work
    assert not list((repo / ".factory" / "runs").glob("result-*L-engine*"))  # no agent ran


def test_a_step_that_writes_outside_its_lane_stops_the_round(tmp_path):
    repo = mini.build(tmp_path)
    env = mini.scenario(tmp_path, {"L-tests": [mini.good(["tests/test_new.py"], "tests")]})
    plan_file(
        repo,
        [
            {
                "name": "A",
                "steps": [{"lane": "L-engine", "run": "echo x > web/x.ts"}],
                "lanes": [job("L-tests", "test-author", "test -f tests/test_new.py")],
            }
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 1
    assert any(row.get("alert") == "guardrail" for row in ledger.read(repo))
    assert (repo / "web" / "x.ts").exists()  # left for the founder
    assert not (repo / "tests" / "test_new.py").exists()  # no agent started
    assert "step(" not in mini.git(repo, "log", "--format=%s")


def test_the_plan_is_named_by_its_directory_under_specs(tmp_path):
    repo = mini.build(tmp_path)
    folder = repo / "specs" / "ui-1"
    folder.mkdir(parents=True)
    path = folder / "plan.yaml"
    rounds = [
        {
            "name": "A",
            "steps": [{"lane": "L-web", "run": "true"}],
            "lanes": [job("L-engine", "builder", "true")],
        }
    ]
    plan = {"branch": "phase-x", "spec": "README.md", "audited": False, "rounds": rounds}
    path.write_text(yaml.safe_dump(plan))
    loaded = phase.load_plan(path, repo)
    assert loaded["name"] == "ui-1"
    assert [j["task"] for j in loaded["rounds"][0]["steps"] + loaded["rounds"][0]["lanes"]] == [
        "ui-1/A/L-web",
        "ui-1/A/L-engine",
    ]
    rounds[0]["steps"] = [{"lane": "L-web"}]
    path.write_text(yaml.safe_dump(plan))
    with pytest.raises(phase.PlanError, match="a step has no run"):
        phase.load_plan(path, repo)
    rounds[0]["steps"] = [{"lane": "L-engine", "run": "true"}]
    path.write_text(yaml.safe_dump(plan))
    with pytest.raises(phase.PlanError, match="uses a lane twice"):
        phase.load_plan(path, repo)


def test_a_stop_needs_a_known_cause(tmp_path):
    repo = mini.build(tmp_path)
    with pytest.raises(ValueError, match="unknown cause"):
        phase._stop(repo, {"branch": "phase-x"}, "stopped", cause="bad luck")
    phase._stop(repo, {"branch": "phase-x"}, "stopped", cause="infra")
    assert ledger.read(repo)[-1]["cause"] == "infra"


def test_the_plan_runs_under_caffeinate_on_a_mac(monkeypatch):
    calls: list[tuple] = []
    monkeypatch.setattr(phase.os, "execve", lambda *a: calls.append(a))
    monkeypatch.setattr(phase.shutil, "which", lambda name: f"/usr/bin/{name}")
    monkeypatch.delenv("DULY_AWAKE", raising=False)
    monkeypatch.setattr(phase.sys, "platform", "darwin")
    phase.stay_awake(["plan.yaml", "--from-round", "B"])
    tool, command, env = calls[0]
    assert tool == "/usr/bin/caffeinate"
    assert command == [
        tool,
        "-dimsu",
        sys.executable,
        "-m",
        "tools.factory.phase",
        "plan.yaml",
        "--from-round",
        "B",
    ]
    assert env["DULY_AWAKE"] == "1"  # so the plan does not start itself again
    monkeypatch.setenv("DULY_AWAKE", "1")
    phase.stay_awake([])
    monkeypatch.delenv("DULY_AWAKE")
    monkeypatch.setattr(phase.sys, "platform", "linux")
    phase.stay_awake([])
    monkeypatch.setattr(phase.sys, "platform", "darwin")
    monkeypatch.setattr(phase.shutil, "which", lambda name: None)
    phase.stay_awake([])
    assert len(calls) == 1


def test_a_closed_plan_leaves_its_scorecard(tmp_path):
    repo = mini.build(tmp_path)
    env = mini.scenario(tmp_path, {"L-engine": [mini.good(["engine/new.py"])]})
    plan_file(repo, [{"name": "A", "lanes": [job("L-engine", "builder", "test -f engine/new.py")]}])
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr
    card = json.loads((repo / ".factory" / "scorecards" / "phase-x.json").read_text())
    assert card["plan"] == "phase-x"
    closed = [r for r in ledger.read(repo) if r.get("closed")]
    assert [(r["kind"], r["plan_file"]) for r in closed] == [("done", "plan.yaml")]
