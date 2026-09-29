"""Which plain texts changed against a base, and whether only the allowed ones did.

Plain words a review accepted are frozen (specs/product-1/SPEC-resolutions.md point 62): a
later round changes only the texts a review names, so a fix to one text cannot bring a new
fault into another. Rows are told apart by id, regime and start date.

Usage: python -m tools.sources.plain_changes BASE [--allow ID[@REGIME][#EFFECTIVE_FROM] ...]
Prints every changed row; with --allow, fails on any change outside the list.
"""

import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
PACK = "rulepacks/f1-us/v2026.09/parameters.yaml"
FIELDS = ("plain", "plain_terms")


def _rows(pack: dict[str, Any]) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for kind in ("regimes", "parameters"):
        for entry in pack.get(kind) or []:
            key = str(entry["id"]) + (f"@{entry['regime']}" if entry.get("regime") else "")
            if entry.get("effective_from"):
                key += f"#{entry['effective_from']}"
            rows[key] = {field: entry.get(field) for field in FIELDS}
    return rows


def changed(base: dict[str, Any], head: dict[str, Any]) -> list[str]:
    before, after = _rows(base), _rows(head)
    return sorted(key for key in before.keys() | after.keys() if before.get(key) != after.get(key))


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    allowed: set[str] | None = None
    if "--allow" in args:
        at = args.index("--allow")
        allowed = set(args[at + 1 :])
        args = args[:at]
    base_ref = args[0] if args else "main"
    shown = subprocess.run(
        ["git", "show", f"{base_ref}:{PACK}"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if shown.returncode:
        print(f"plain changes: cannot read {PACK} at {base_ref}")
        return 1
    rows = changed(yaml.safe_load(shown.stdout), yaml.safe_load((REPO_ROOT / PACK).read_text()))
    for key in rows:
        print(f"changed: {key}")
    outside = [key for key in rows if allowed is not None and key not in allowed]
    if outside:
        named = ", ".join(outside)
        print(f"plain changes: {len(outside)} row(s) changed that no review named: {named}")
        return 1
    print(f"plain changes: {len(rows)} row(s) changed, all allowed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
