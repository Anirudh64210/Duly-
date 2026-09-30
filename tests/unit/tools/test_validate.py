"""Gate 7: the factory's own files are whole before anything runs."""

import shutil

import yaml

from tools.factory import validate
from tools.factory.paths import REPO_ROOT


def test_the_shipped_factory_is_whole():
    assert validate.problems(REPO_ROOT) == []


def test_a_plan_that_names_an_agent_with_no_contract_is_caught(tmp_path):
    for part in ("factory", "contracts", "evals/factory", ".claude", "tools/diff_policy"):
        if (REPO_ROOT / part).exists():
            shutil.copytree(REPO_ROOT / part, tmp_path / part)
    (tmp_path / "specs" / "x").mkdir(parents=True)
    plan = {
        "branch": "x",
        "spec": "specs/x/SPEC.md",
        "rounds": [
            {
                "name": "one",
                "lanes": [{"lane": "L-engine", "agent": "nobody", "mission": "m", "done": "true"}],
            },
            {
                "name": "audit",
                "lanes": [{"lane": "L-audit", "agent": "auditor", "mission": "m", "done": "true"}],
            },
        ],
    }
    (tmp_path / "specs" / "x" / "plan.yaml").write_text(yaml.safe_dump(plan))
    found = validate.problems(tmp_path)
    assert any("no contract for agent nobody" in p for p in found), found


def test_a_billing_problem_is_reported_once(monkeypatch):
    monkeypatch.setattr(validate, "settings_problems", lambda root: ["a key is set"])
    assert validate.problems(REPO_ROOT).count("a key is set") == 1


def test_the_health_probe_model_is_on_the_list_and_no_contract_names_it(tmp_path):
    for part in ("factory", "contracts", "evals/factory", ".claude", "tools/diff_policy"):
        if (REPO_ROOT / part).exists():
            shutil.copytree(REPO_ROOT / part, tmp_path / part)
    assert validate.problems(tmp_path) == []  # D67 allows the shipped probe model
    path = tmp_path / "factory" / "config.yaml"
    config = yaml.safe_load(path.read_text())
    config["model"]["health_probe"] = "claude-opus-5-5"
    path.write_text(yaml.safe_dump(config))
    found = validate.problems(tmp_path)
    assert any("claude-opus-5-5 is not one of claude-haiku-4-5-20251001" in p for p in found)
    assert any("a contract names it" in p for p in found)
    del config["model"]["health_probe"]
    path.write_text(yaml.safe_dump(config))
    assert validate.problems(tmp_path) == []
