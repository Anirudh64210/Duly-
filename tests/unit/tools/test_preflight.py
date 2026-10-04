"""A plan's own faults are found before any agent runs: each case is one that cost an agent
attempt in product-2."""

import sys
from pathlib import Path

import yaml

from tests.support import mini_factory as mini
from tools.factory import preflight


def plan(repo: Path, rounds: list[dict], spec: str = "README.md") -> Path:
    path = repo / "plan.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "branch": "phase-x",
                "spec": spec,
                "goal": "Check the plan.",
                "merge": "local",
                "audited": False,
                "rounds": rounds,
            }
        )
    )
    return path


def lane(name: str, agent: str, mission: str, done: str = "true") -> dict:
    return {"lane": name, "agent": agent, "mission": mission, "done": done}


def test_a_whole_plan_passes(tmp_path):
    repo = mini.build(tmp_path)
    (repo / "README.md").write_text("## 1. One\n\n2. Two\n")
    path = plan(
        repo,
        [
            {
                "name": "A",
                "lanes": [
                    lane("L-tests", "test-author", "Write tests/test_a.py for points 1 to 2.")
                ],
            },
            {
                "name": "B",
                "lanes": [lane("L-engine", "builder", "Pass.", "pytest tests/test_a.py")],
            },
        ],
    )
    assert preflight.problems(path, repo) == []  # tests/test_a.py is made by round A


def test_a_lane_told_to_write_outside_its_paths_is_found(tmp_path):
    repo = mini.build(tmp_path)
    path = plan(
        repo, [{"name": "A", "lanes": [lane("L-tests", "test-author", "Write web/src/x.test.ts.")]}]
    )
    assert preflight.problems(path, repo) == [
        "round A L-tests: the mission has it write web/src/x.test.ts, which it does not own"
    ]


def test_a_file_that_gains_or_is_added_to_is_a_write(tmp_path):
    # plan-w2-p3-fix0: L-api, which owns api/ only, was told "desktop/python/bundle.json gains
    # contracts/schedule.schema.json"; the lane could not write it and failed three attempts.
    repo = mini.build(tmp_path)
    mission = (
        "desktop/python/bundle.json gains two schemas; add the route to web/src/app.ts; "
        "update engine/x.py; api/case.py becomes stricter."
    )
    found = preflight.problems(
        plan(repo, [{"name": "A", "lanes": [lane("L-api", "builder", mission)]}]), repo
    )
    assert any("write desktop/python/bundle.json" in p for p in found)
    assert any("write web/src/app.ts" in p for p in found)
    assert any("write engine/x.py" in p for p in found)
    assert not any("api/case.py" in p for p in found)


def test_an_agent_with_no_contract_for_its_lane_is_found(tmp_path):
    # plan-w2-p4 gave L-security the builder agent; tools.factory.validate refuses that, and so
    # did the run, at the lane's round. The red-team agent holds the L-security contract.
    repo = mini.build(tmp_path)
    mission = "Write security/threat-model.md rows."
    bad = plan(repo, [{"name": "A", "lanes": [lane("L-security", "builder", mission)]}])
    assert preflight.problems(bad, repo) == [
        "round A L-security: agent builder has no contract for lane L-security"
    ]
    good = plan(repo, [{"name": "A", "lanes": [lane("L-security", "red-team", mission)]}])
    assert preflight.problems(good, repo) == []


def test_a_copy_names_its_target_and_a_move_its_source_too(tmp_path):
    repo = mini.build(tmp_path)
    mission = "Move tests/a.py to engine/a.py, then copy engine/b.py to web/b.py."
    found = preflight.problems(
        plan(repo, [{"name": "A", "lanes": [lane("L-engine", "builder", mission)]}]), repo
    )
    assert any("write tests/a.py" in p for p in found)
    assert any("write web/b.py" in p for p in found)
    assert not any("write engine/a.py" in p for p in found)


def test_a_done_command_held_to_a_file_the_lane_cannot_make(tmp_path):
    repo = mini.build(tmp_path)
    done = "npx eslint web/src/fix.test.ts && uv run pytest tests/test_a.py"
    path = plan(
        repo, [{"name": "A", "lanes": [lane("L-tests", "test-author", "Write tests.", done)]}]
    )
    assert preflight.problems(path, repo) == [
        "round A L-tests: the done command needs web/src/fix.test.ts, "
        "but it does not exist and the lane cannot make it"
    ]


def test_a_done_command_held_to_another_lanes_parallel_work(tmp_path):
    repo = mini.build(tmp_path)
    rounds = [
        {
            "name": "A",
            "lanes": [
                lane("L-tests", "test-author", "Write tests.", "pytest tests/test_b.py"),
                lane("L-engine", "builder", "Build.", "pytest tests/test_a.py"),
            ],
        }
    ]
    found = preflight.problems(plan(repo, rounds), repo)
    assert found == [
        "round A L-engine: the done command needs tests/test_a.py, "
        "but only L-tests in the same round can make it"
    ]


def test_a_root_flag_is_followed(tmp_path):
    repo = mini.build(tmp_path)
    (repo / "web" / "src").mkdir(parents=True, exist_ok=True)
    (repo / "web" / "src" / "a.test.ts").write_text("x\n")
    mini.git(repo, "add", "web")
    mini.git(repo, "commit", "-q", "-m", "web test")
    done = "npx vitest run --root web src/a.test.ts"
    path = plan(repo, [{"name": "A", "lanes": [lane("L-tests", "test-author", "Check.", done)]}])
    assert preflight.problems(path, repo, ref="HEAD") == []


def test_git_in_a_done_command_and_missing_points_and_branches(tmp_path):
    repo = mini.build(tmp_path)
    (repo / "README.md").write_text("## 1. One\n")
    mission = "Apply point 7 from lane/L-engine/l-engine-gone."
    path = plan(
        repo, [{"name": "A", "lanes": [lane("L-engine", "builder", mission, "git add -A")]}]
    )
    found = preflight.problems(path, repo)
    assert "round A L-engine: the done command changes git; it runs in the jail" in found
    assert "round A L-engine: the mission names point 7, not in README.md" in found
    assert (
        "round A L-engine: the mission names branch lane/L-engine/l-engine-gone, "
        "which does not exist" in found
    )


def test_a_broken_plan_and_the_command(tmp_path, capsys):
    repo = mini.build(tmp_path)
    bad = repo / "bad.yaml"
    bad.write_text("branch: phase-x\n")
    assert preflight.problems(bad, repo) == ["the plan has no spec"]
    assert preflight.main([]) == 2
    assert preflight.main([str(bad)]) == 1
    assert "preflight: 1 problem(s)" in capsys.readouterr().out


def test_a_plan_with_no_goal_is_found(tmp_path):
    repo = mini.build(tmp_path)
    path = repo / "plan.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "branch": "phase-x",
                "spec": "README.md",
                "audited": False,
                "rounds": [{"name": "A", "lanes": [lane("L-engine", "builder", "Build.")]}],
            }
        )
    )
    assert preflight.problems(path, repo) == [
        "the plan has no goal: every lane is told it, so it sees the whole picture"
    ]


def test_a_step_is_checked_and_what_it_makes_counts_for_its_round(tmp_path):
    repo = mini.build(tmp_path)
    rounds = [
        {
            "name": "A",
            "steps": [{"lane": "L-engine", "run": "make samples"}],
            "lanes": [lane("L-tests", "test-author", "Check.", "pytest engine/samples.py")],
        }
    ]
    assert preflight.problems(plan(repo, rounds), repo) == []
    rounds[0]["steps"] = [{"lane": "L-nobody", "run": "make samples && git commit -am x"}]
    found = preflight.problems(plan(repo, rounds), repo)
    assert any(p.startswith("round A:") and "L-nobody" in p for p in found)
    assert "round A step L-nobody: git is the orchestrator's" in found


def test_a_lane_whose_mission_is_only_one_command_is_found(tmp_path):
    repo = mini.build(tmp_path)
    for mission in (
        "Run make samples, change nothing else.",
        "run `make samples`. Change nothing else",
        "Run uv run pytest tests/unit -q.",
    ):
        rounds = [{"name": "A", "lanes": [lane("L-engine", "builder", mission)]}]
        assert preflight.problems(plan(repo, rounds), repo) == [
            "round A L-engine: the mission only runs a command; make it a round step"
        ], mission
    for mission in ("Run pytest and fix what fails.", "Run make samples, then read engine/x.py."):
        rounds = [{"name": "A", "lanes": [lane("L-engine", "builder", mission)]}]
        assert preflight.problems(plan(repo, rounds), repo) == [], mission


def test_a_founder_gate_failing_before_any_agent_is_found(tmp_path):
    ok = (sys.executable, "-c", "pass")
    bad = (sys.executable, "-c", "import sys; print('copy lint: 7 problem(s)'); sys.exit(1)")
    assert preflight.baseline(tmp_path, (ok,)) == []
    found = preflight.baseline(tmp_path, (ok, bad))
    assert len(found) == 1
    assert "copy lint: 7 problem(s)" in found[0]


def test_a_builder_held_to_the_hidden_tests_is_found(tmp_path):
    # agent_run hides tests/holdout from implementation lanes; W2-P1's fix plan lost three
    # attempts to a builder's done command that named a hidden test file.
    repo = mini.build(tmp_path)
    done = "uv run pytest tests/test_a.py tests/holdout/test_h.py -q"
    path = plan(repo, [{"name": "A", "lanes": [lane("L-engine", "builder", "Pass.", done)]}])
    assert any(
        "reads tests/holdout, which is hidden from implementation lanes" in p
        for p in preflight.problems(path, repo)
    )
    tests = [{"name": "A", "lanes": [lane("L-tests", "test-author", "Write tests.", done)]}]
    assert not any("hidden from" in p for p in preflight.problems(plan(repo, tests), repo))
