"""Plain words a review accepted are frozen; only the rows a review names may change."""

from tools.sources import plain_changes

BASE = {
    "regimes": [{"id": "ds_2012", "plain": "Today's rule."}],
    "parameters": [
        {"id": "opt.max_months", "plain": "Twelve months.", "plain_terms": []},
        {"id": "grace.after_completion_days", "regime": "ds_2012", "plain": "Sixty days."},
        {"id": "grace.after_completion_days", "regime": "fixed_admission_2026", "plain": "Thirty."},
    ],
}


def test_nothing_changed_is_nothing():
    assert plain_changes.changed(BASE, BASE) == []


def test_rows_are_told_apart_by_regime_and_terms_count_as_a_change():
    head = {
        "regimes": BASE["regimes"],
        "parameters": [
            {
                "id": "opt.max_months",
                "plain": "Twelve months.",
                "plain_terms": ["practical training"],
            },
            {"id": "grace.after_completion_days", "regime": "ds_2012", "plain": "Sixty days."},
            {"id": "grace.after_completion_days", "regime": "fixed_admission_2026", "plain": "30."},
        ],
    }
    assert plain_changes.changed(BASE, head) == [
        "grace.after_completion_days@fixed_admission_2026",
        "opt.max_months",
    ]


def test_rows_of_one_id_are_told_apart_by_their_start_date():
    base = {
        "parameters": [
            {"id": "capgap.end_month_day", "effective_from": "2008-04-08", "plain": "October 1."},
            {"id": "capgap.end_month_day", "effective_from": "2025-01-17", "plain": "April 1."},
        ]
    }
    head = {
        "parameters": [
            {"id": "capgap.end_month_day", "effective_from": "2008-04-08", "plain": "October 1."},
            {
                "id": "capgap.end_month_day",
                "effective_from": "2025-01-17",
                "plain": "April the 1st.",
            },
        ]
    }
    assert plain_changes.changed(base, head) == ["capgap.end_month_day#2025-01-17"]


def test_the_shipped_pack_reads_against_its_own_branch():
    assert plain_changes.main(["HEAD"]) == 0


def test_a_change_no_review_named_fails_and_a_named_one_passes(tmp_path, monkeypatch, capsys):
    import subprocess

    import yaml

    base = {"parameters": [{"id": "opt.max_months", "plain": "Twelve months."}]}
    head = {"parameters": [{"id": "opt.max_months", "plain": "A year."}]}
    pack = tmp_path / plain_changes.PACK
    pack.parent.mkdir(parents=True)
    pack.write_text(yaml.safe_dump(head))
    monkeypatch.setattr(plain_changes, "REPO_ROOT", tmp_path)

    def shown(*args, **kwargs):
        return subprocess.CompletedProcess(args, 0, yaml.safe_dump(base), "")

    monkeypatch.setattr(plain_changes.subprocess, "run", shown)
    assert plain_changes.main(["base", "--allow", "grace.after_completion_days"]) == 1
    assert "no review named: opt.max_months" in capsys.readouterr().out
    assert plain_changes.main(["base", "--allow", "opt.max_months"]) == 0
    assert "1 row(s) changed, each one allowed" in capsys.readouterr().out
    assert plain_changes.main(["base"]) == 0  # without --allow it lists and says so
    assert "no --allow given, so none was checked" in capsys.readouterr().out
    assert plain_changes.main(["--allow", "opt.max_months", "base"]) == 2


def test_a_base_that_cannot_be_read_fails(monkeypatch, capsys):
    import subprocess

    def missing(*args, **kwargs):
        return subprocess.CompletedProcess(args, 128, "", "fatal: invalid object name")

    monkeypatch.setattr(plain_changes.subprocess, "run", missing)
    assert plain_changes.main(["no-such-branch"]) == 1
    assert "cannot read" in capsys.readouterr().out
