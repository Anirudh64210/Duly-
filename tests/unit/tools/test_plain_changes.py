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
