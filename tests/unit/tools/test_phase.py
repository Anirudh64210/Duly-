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


def plan_file(repo: Path, rounds: list[dict], **extra) -> Path:
    path = repo / "plan.yaml"
    path.write_text(
        yaml.safe_dump(
            {"branch": "phase-x", "spec": "README.md", "merge": "local", "rounds": rounds, **extra}
        )
    )
    mini.git(repo, "checkout", "-q", "phase-x")
    mini.git(repo, "add", "plan.yaml")
    mini.git(repo, "commit", "-q", "-m", "plan")
    return path


def orchestrate(repo: Path, env: dict[str, str], *args: str) -> subprocess.CompletedProcess:
    full = {**os.environ, **env, "PYTHONPATH": str(mini.REAL)}
    return subprocess.run(
        [sys.executable, "-m", "tools.factory.phase", "plan.yaml", *args],
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
                "checks": [],
            }
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 1
    assert "rerun with --from-round A" in done.stdout
    assert (repo / "tests" / "test_new.py").exists()
    assert not (repo / "engine" / "new.py").exists()


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
                "what_happens": "no_open_items",
            }
        ],
    }
    env = mini.scenario(tmp_path, {"L-review": [reviewer(veto)]})
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
    assert any(row.get("alert") == "eval_drop" for row in ledger.read(repo))


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
    env = mini.scenario(
        tmp_path,
        {
            "L-factory": [
                mini.good([".claude/LESSONS/proposals/a.md"], ".claude/LESSONS", "lesson\n")
            ]
        },
    )
    plan_file(
        repo,
        [
            {
                "name": "K",
                "lanes": [
                    job("L-factory", "skill-curator", "test -f .claude/LESSONS/proposals/a.md")
                ],
                "checks": [],
            }
        ],
    )
    done = orchestrate(repo, env)
    assert done.returncode == 0, done.stdout + done.stderr
    assert "waiting for the founder (skill_or_prompt_changed)" in done.stdout
    assert not (repo / ".claude" / "LESSONS" / "proposals" / "a.md").exists()
    assert "lane/L-factory/" in mini.git(repo, "branch", "--list", "lane/*")


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
    plan = {"branch": "phase-x", "spec": "README.md", "rounds": [], **change}
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
    done = orchestrate(repo, {"DULY_NO_NOTIFY": "1"})
    assert done.returncode == 1
    assert "already claimed" in done.stdout


def test_changes_that_need_the_founder_are_named():
    found = phase.needs_founder(
        [
            "pyproject.toml",
            "engine/f1.py",
            ".github/workflows/ci.yml",
            ".claude/hooks/guard_bash.py",
            "contracts/openapi.yaml",
        ]
    )
    assert set(found) == {
        "dependency_added",
        "ci_or_infra_changed",
        "guardrail_changed",
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
                "lanes": [job("L-engine", "builder", "test -f engine/new.py")],
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
