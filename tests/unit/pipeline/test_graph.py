import copy

import pytest

from pipeline.graph import STAGES, build_graph, publish_blockers

GOOD = {
    "legal_status": "enjoined",
    "status_as_of": "2026-09-14",
    "claims": [
        {
            "text": "A court blocked the rule nationwide.",
            "quote": "is hereby enjoined",
            "source_url": "https://www.courtlistener.com/docket/1/",
            "source_kind": "primary",
            "snapshot_sha256": "a" * 64,
            "quote_found": True,
        }
    ],
    "checks": {"independent_check_passed": True, "refutation_survived": True},
    "approval": {"approved": True, "approved_by": "founder", "approved_at": "2026-09-15T10:00:00Z"},
}


def changed(path, value):
    update = copy.deepcopy(GOOD)
    node = update
    for key in path[:-1]:
        node = node[key]
    node[path[-1]] = value
    return update


def test_a_fully_checked_update_may_publish():
    assert publish_blockers(GOOD) == ()


@pytest.mark.parametrize(
    ("path", "value", "reason"),
    [
        (("claims",), [], "no_claims"),
        (("claims", 0, "source_kind"), "signal", "claim_0_not_primary_source"),
        (("claims", 0, "quote_found"), False, "claim_0_quote_not_found_in_source"),
        (("claims", 0, "snapshot_sha256"), "", "claim_0_no_snapshot"),
        (("checks", "independent_check_passed"), False, "independent_check_not_passed"),
        (("checks", "refutation_survived"), False, "refutation_not_survived"),
        (("legal_status",), "", "no_legal_status"),
        (("status_as_of",), "", "no_status_date"),
        (("approval", "approved"), False, "not_approved_in_ops"),
        (("approval", "approved_by"), None, "not_approved_in_ops"),
    ],
)
def test_each_missing_check_blocks_publishing(path, value, reason):
    assert reason in publish_blockers(changed(path, value))


def test_an_empty_update_is_blocked_for_every_reason():
    assert len(publish_blockers({})) >= 5


def test_stage_order_ends_with_approval_publish_watch():
    assert STAGES[-3:] == ("founder_approval", "publish", "watch")
    assert STAGES.index("verify_quotes") < STAGES.index("independent_check")


def test_graph_publishes_a_checked_update():
    out = build_graph().invoke({"update": GOOD})
    assert out["visited"] == list(STAGES)
    assert "held_at" not in out


def test_graph_holds_an_unapproved_update_before_publish():
    out = build_graph().invoke({"update": changed(("approval", "approved"), False)})
    assert out["held_at"] == "founder_approval"
    assert "publish" not in out["visited"]
    assert "not_approved_in_ops" in out["held_because"]
