"""The publish rule for law updates (SPEC-FEED point 35; DECISIONS.md D95 (2)).

Standard library only, so the server and the packaged engine both load it. A law update is
shown to a user only when publish_blockers returns nothing.
"""

from typing import Any


def publish_blockers(update: dict[str, Any]) -> tuple[str, ...]:
    """Every reason this update may not be shown to a user. Empty means it may."""
    reasons: list[str] = []
    claims = update.get("claims") or []
    if not claims:
        reasons.append("no_claims")
    for i, claim in enumerate(claims):
        if claim.get("source_kind") != "primary":
            reasons.append(f"claim_{i}_not_primary_source")
        if not claim.get("quote_found"):
            reasons.append(f"claim_{i}_quote_not_found_in_source")
        if not claim.get("snapshot_sha256"):
            reasons.append(f"claim_{i}_no_snapshot")
    checks = update.get("checks") or {}
    if not checks.get("independent_check_passed"):
        reasons.append("independent_check_not_passed")
    if not checks.get("refutation_survived"):
        reasons.append("refutation_not_survived")
    if not update.get("legal_status"):
        reasons.append("no_legal_status")
    if not update.get("status_as_of"):
        reasons.append("no_status_date")
    approval = update.get("approval") or {}
    if not (approval.get("approved") and approval.get("approved_by")):
        reasons.append("not_approved_in_ops")
    return tuple(reasons)
