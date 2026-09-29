from tools.gates import engine_literals


def check(tmp_path, source):
    path = tmp_path / "f1.py"
    path.write_text(source)
    return engine_literals.findings(path)


def test_a_number_from_nowhere_is_caught(tmp_path):
    found = check(tmp_path, "def f(d):\n    return d + 14\n")
    assert found == ["f1.py:2: the number 14 has no source"]


def test_arithmetic_and_booleans_and_text_pass(tmp_path):
    source = (
        '"""Counts 90 days."""\n\n'
        "def f(d, pack):\n    ok = True\n"
        '    return d + 1 - 0 + pack.value("opt.limit")\n'
    )
    assert check(tmp_path, source) == []


def test_main_reports_and_fails(tmp_path, monkeypatch, capsys):
    (tmp_path / "engine").mkdir()
    (tmp_path / "engine" / "f1.py").write_text("LIMIT = 365\n")
    monkeypatch.setattr("sys.argv", ["check", str(tmp_path)])
    assert engine_literals.main() == 1
    assert "365" in capsys.readouterr().out
    (tmp_path / "engine" / "f1.py").write_text("LIMIT = None\n")
    assert engine_literals.main() == 0
