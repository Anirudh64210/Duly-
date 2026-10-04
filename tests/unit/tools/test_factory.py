import hashlib
import json
import subprocess

import pytest

from dashboard import factory_data
from tools.factory import log
from tools.sources import verify


@pytest.fixture
def repo(tmp_path):
    subprocess.run(["git", "init", "-q", "-b", "main", str(tmp_path)], check=True)
    lanes = tmp_path / ".claude" / "lanes"
    lanes.mkdir(parents=True)
    (lanes / "L-web.yaml").write_text(
        'name: L-web\nkind: implementation\nreview: low\nowned: ["web/**"]\ntest: x\n'
    )
    skill = tmp_path / ".claude" / "skills" / "one"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text("x")
    return tmp_path


def test_events_are_appended_and_read_back(repo):
    log.append("L-web", "builder", "start", "build the screen", repo)
    log.append("L-web", "builder", "step", "  writes web/src/App.tsx  ", repo)
    rows = factory_data.read_events(repo)
    assert [r["kind"] for r in rows] == ["start", "step"]
    assert rows[1]["message"] == "writes web/src/App.tsx"
    assert log.factory_dir(repo) == repo / ".factory"


def test_long_messages_are_cut(repo):
    log.append("L-web", "builder", "step", "x" * 900, repo)
    assert len(factory_data.read_events(repo)[0]["message"]) == 500


def test_broken_lines_are_skipped(repo):
    log.append("L-web", "builder", "step", "one", repo)
    with (repo / ".factory" / "events.jsonl").open("a") as handle:
        handle.write("not json\n")
    assert len(factory_data.read_events(repo)) == 1


PAGE = "<p>may not exceed  <i>90 days</i> of &ldquo;unemployment&rdquo;</p>"


def pack(tmp_path, value=90, derivation="verbatim", note="", **source):
    folder = tmp_path / "rulepacks" / "f1-us" / "v1"
    (folder / "sources").mkdir(parents=True, exist_ok=True)
    (folder / "sources" / "cfr.xml").write_text(PAGE)
    base = {
        "citation": "8 CFR 214.2(f)(10)(ii)(E)",
        "url": "https://www.ecfr.gov/x",
        "checked_on": "2026-09-28",
        "quote": 'may not exceed 90 days of "unemployment"',
        "snapshot": "sources/cfr.xml",
        "snapshot_sha256": hashlib.sha256(PAGE.encode()).hexdigest(),
    }
    base.update(source)
    rule = {
        "id": "opt.limit",
        "value": value,
        "unit": "days",
        "status": "settled",
        "derivation": derivation,
        "note": note,
        "effective_from": "2008-04-08",
        "source": {k: v for k, v in base.items() if v},
    }
    path = folder / "parameters.yaml"
    path.write_text(json.dumps({"parameters": [rule], "regimes": []}))
    return path


def test_a_quote_found_in_the_saved_copy_passes(tmp_path):
    assert verify.check_pack(pack(tmp_path)) == []


@pytest.mark.parametrize(
    ("change", "problem"),
    [
        ({"quote": "may not exceed 120 days"}, "quote not found"),
        ({"snapshot_sha256": "0" * 64}, "has changed since"),
        ({"snapshot": "sources/gone.xml"}, "is missing"),
        ({"quote": ""}, "needs quote"),
        ({"url": "https://www.reddit.com/r/f1visa"}, "is not a primary source"),
        ({"value": 120}, "is not in the quote"),
        ({"derivation": ""}, "needs derivation"),
        ({"value": 3, "derivation": "reading"}, "a reading needs a note"),
    ],
)
def test_each_weakness_is_caught(tmp_path, change, problem):
    found = verify.check_pack(pack(tmp_path, **change))
    assert any(problem in p for p in found), found


def test_main_reports_and_fails(tmp_path, monkeypatch, capsys):
    pack(tmp_path, quote="90 words that are not there")
    monkeypatch.setattr("sys.argv", ["verify", str(tmp_path / "rulepacks")])
    assert verify.main() == 1
    assert "1 problem(s)" in capsys.readouterr().out
    pack(tmp_path)
    assert verify.main() == 0


def test_a_reading_with_a_note_passes(tmp_path):
    path = pack(tmp_path, value=3, derivation="reading", note="90 days is about 3 months")
    assert verify.check_pack(path) == []


@pytest.mark.parametrize(
    ("value", "quote", "written"),
    [
        (90, "may not exceed 90 days", True),
        (90, "may not exceed ninety days", True),
        (90, "may not exceed 190 days", False),
        (12, "one year or more", False),
        (1, "one year or more", True),
        (24, "a twenty-four month extension", True),
        (150, "one hundred fifty days", True),
        ("04-01", "until April 1 of the fiscal year", True),
        ("04-01", "until April 15", False),
        (True, "anything", True),
    ],
)
def test_value_is_written(value, quote, written):
    assert verify.value_is_written(value, quote) is written
