from tools.requirements import register

ROW = {
    "id": "PLAN01-001",
    "source": "duly-plan/01",
    "text": "Students log in.",
    "kind": "product",
    "status": "met",
    "evidence": "api/auth.py",
    "note": "Built.",
}


def test_a_requirement_is_met_only_with_something_that_proves_it():
    assert register.problems([ROW]) == []
    assert "nothing named that proves it" in register.problems([{**ROW, "evidence": "none"}])[0]
    assert "appears twice" in register.problems([ROW, ROW])[0]
    assert "unknown status" in register.problems([{**ROW, "status": "mostly"}])[0]
    assert (
        "no evidence" in register.problems([{k: v for k, v in ROW.items() if k != "evidence"}])[0]
    )


def test_the_share_met_leaves_out_what_is_deferred_or_overridden():
    rows = [
        ROW,
        {**ROW, "id": "a", "status": "not_started"},
        {**ROW, "id": "b", "status": "partial"},
        {**ROW, "id": "c", "status": "deferred"},
        {**ROW, "id": "d", "status": "superseded"},
    ]
    assert len(register.in_scope(rows)) == 3
    assert round(register.share_met(rows), 3) == 0.333
    assert register.share_met([]) == 0.0


def test_a_new_spec_must_say_what_it_covers(tmp_path):
    folder = tmp_path / "specs" / "path-1"
    folder.mkdir(parents=True)
    (tmp_path / "specs" / "phase-2").mkdir()
    (tmp_path / "specs" / "phase-2" / "SPEC.md").write_text("# Old\n")  # left as it is
    spec = folder / "SPEC.md"
    spec.write_text("# New\n\n## Goal\n\nx\n")
    assert register.spec_problems(tmp_path, [ROW]) == [
        "specs/path-1/SPEC.md: has no section named Covers"
    ]
    spec.write_text("# New\n\n## Covers\n\nNothing yet.\n\n## Goal\n")
    assert "names no requirement" in register.spec_problems(tmp_path, [ROW])[0]
    spec.write_text("# New\n\n## Covers\n\nPLAN01-001 and PLAN09-404.\n")
    found = register.spec_problems(tmp_path, [ROW])
    assert "PLAN09-404 is not in the register" in found[0]
    assert "share of the whole" in found[1]
    spec.write_text("# New\n\n## Covers\n\nPLAN01-001. That is 1 of 1623 requirements.\n")
    assert register.spec_problems(tmp_path, [ROW]) == []


def test_the_shipped_register_is_whole():
    import json

    rows = json.loads((register.FOLDER / "register.json").read_text())
    assert len(rows) > 1500
    assert register.problems(rows) == []


def test_the_register_is_built_from_its_parts_with_a_table_for_each_kind(tmp_path):
    import json

    (tmp_path / "parts").mkdir()
    (tmp_path / "parts" / "plan.json").write_text(
        json.dumps(
            [
                ROW,
                {**ROW, "id": "PLAN01-002", "status": "not_started"},
                {**ROW, "id": "PLAN01-003", "kind": "factory", "status": "partial"},
                {**ROW, "id": "PLAN01-004", "kind": "unheard of", "status": "deferred"},
            ]
        )
    )
    rows = register.build(tmp_path)
    assert [r["part"] for r in rows] == ["plan"] * 4
    assert rows[3]["kind"] == "product"  # a kind the register does not know is product
    assert json.loads((tmp_path / "register.json").read_text()) == rows
    text = (tmp_path / "REGISTER.md").read_text()
    assert "Of the 3 that the first version must hold, 1 are met: 33%." in text
    assert "| product | 1 | 0 | 1 | 50% |" in text  # the deferred row is left out
    assert "| factory | 0 | 1 | 0 | 0% |" in text
    assert "| plan | 1 | 1 | 1 | 33% |" in text


def test_the_command_checks_the_register_and_the_specs(tmp_path, monkeypatch, capsys):
    import json

    monkeypatch.setattr(register, "FOLDER", tmp_path)
    monkeypatch.setattr(register, "REPO_ROOT", tmp_path)
    monkeypatch.setattr("sys.argv", ["register", "check"])
    assert register.main() == 1
    assert "register.json is missing" in capsys.readouterr().out
    (tmp_path / "register.json").write_text(json.dumps([ROW, ROW]))
    assert register.main() == 1
    assert "1 problem(s)" in capsys.readouterr().out
    (tmp_path / "register.json").write_text(json.dumps([ROW]))
    assert register.main() == 0
    assert "1 requirements, whole" in capsys.readouterr().out
