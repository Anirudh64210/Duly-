import pytest

from tools.diff_policy.check import Lane, LaneError, load_lane, matches, violations


def lane(root, name, kind, owned):
    folder = root / ".claude" / "lanes"
    folder.mkdir(parents=True, exist_ok=True)
    rows = "".join(f'  - "{p}"\n' for p in owned)
    (folder / f"{name}.yaml").write_text(f"name: {name}\nkind: {kind}\nowned:\n{rows}test: x\n")
    return load_lane(name, root)


def test_every_shipped_lane_loads():
    for name in (
        "founder",
        "L-engine",
        "L-api",
        "L-narration",
        "L-pipeline",
        "L-web",
        "L-ops",
        "L-desktop",
        "L-content",
        "L-tests",
        "L-evals",
        "L-security",
    ):
        assert load_lane(name).name == name


def test_lane_may_change_what_it_owns(tmp_path):
    web = lane(tmp_path, "L-web", "implementation", ["web/**"])
    assert violations(web, ["web/src/App.tsx", "web/package.json"]) == []


@pytest.mark.parametrize(
    "path",
    [
        "tests/unit/x.py",
        "tests/holdout/x.py",
        "evals/boundary/pairs.jsonl",
        "security/a.md",
        ".claude/settings.json",
        ".github/workflows/ci.yml",
        "api/main.py",
        "BOUNDARY.md",
        "webhooks/x.py",
    ],
)
def test_lane_may_not_change_anything_else(tmp_path, path):
    web = lane(tmp_path, "L-web", "implementation", ["web/**"])
    assert violations(web, [path]) == [path]


@pytest.mark.parametrize(
    "owned",
    ["tests/**", "evals/**", ".claude/**", "**", "tools/gates/**", "BOUNDARY.md", "contracts/**"],
)
def test_implementation_lane_cannot_be_given_the_paths_that_grade_it(tmp_path, owned):
    with pytest.raises(LaneError, match="cannot own"):
        lane(tmp_path, "L-bad", "implementation", [owned])


def test_guard_lane_owns_its_folder_only(tmp_path):
    tests = lane(tmp_path, "L-tests", "guard", ["tests/**"])
    assert violations(tests, ["tests/unit/a.py", "engine/verdict.py"]) == ["engine/verdict.py"]


def test_founder_may_change_anything():
    founder = Lane("founder", "founder", ("**",), "")
    assert violations(founder, ["tests/holdout/a.py", "BOUNDARY.md"]) == []


def test_unknown_lane_and_kind_are_refused(tmp_path):
    with pytest.raises(LaneError, match="unknown lane"):
        load_lane("L-nope", tmp_path)
    with pytest.raises(LaneError, match="unknown kind"):
        lane(tmp_path, "L-x", "helper", ["web/**"])


def test_matches():
    assert matches("web/src/a.ts", "web/**")
    assert not matches("webhooks/a.ts", "web/**")
    assert matches("BOUNDARY.md", "BOUNDARY.md")
