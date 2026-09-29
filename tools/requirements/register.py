"""The requirements register: every requirement in the project's own documents, where it
comes from, whether it is met, and what proves it.

  build    join the audited parts into docs/requirements/register.json and REGISTER.md
  check    fail when the register is malformed, or a SPEC does not say which requirements
           it covers and what share of the whole that is
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
FOLDER = REPO_ROOT / "docs" / "requirements"
STATUSES = ("met", "partial", "not_started", "deferred", "superseded")
KINDS = (
    "product",
    "engine",
    "updates",
    "security",
    "privacy",
    "legal",
    "design",
    "factory",
    "testing",
    "ops",
    "email",
    "workbook",
    "desktop",
)
FIELDS = ("id", "source", "text", "kind", "status", "evidence", "note")
NAMES = {
    "met": "Met",
    "partial": "Partly built",
    "not_started": "Not started",
    "deferred": "Deferred",
    "superseded": "Overridden by a decision",
}


def problems(rows: list[dict[str, Any]]) -> list[str]:
    found = []
    seen: set[str] = set()
    for n, row in enumerate(rows):
        where = str(row.get("id") or f"row {n}")
        missing = [f for f in FIELDS if f not in row]
        if missing:
            found.append(f"{where}: no {', '.join(missing)}")
            continue
        if row["id"] in seen:
            found.append(f"{where}: appears twice")
        seen.add(row["id"])
        if row["status"] not in STATUSES:
            found.append(f"{where}: unknown status {row['status']}")
        if row["status"] == "met" and str(row["evidence"]).strip().lower() in {"", "none"}:
            found.append(f"{where}: met, with nothing named that proves it")
    return found


def in_scope(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """What the first version must hold: everything not deferred and not overridden."""
    return [r for r in rows if r["status"] in {"met", "partial", "not_started"}]


def share_met(rows: list[dict[str, Any]]) -> float:
    scope = in_scope(rows)
    return sum(r["status"] == "met" for r in scope) / len(scope) if scope else 0.0


def table(rows: list[dict[str, Any]], key: str, order: tuple[str, ...]) -> list[str]:
    out = [
        f"| {key.capitalize()} | Met | Partly built | Not started | Share met |",
        "|---|---|---|---|---|",
    ]
    groups = [g for g in order if any(r[key] == g for r in rows)]
    groups += sorted({r[key] for r in rows} - set(groups))
    for group in groups:
        mine = in_scope([r for r in rows if r[key] == group])
        if not mine:
            continue
        count = Counter(r["status"] for r in mine)
        out.append(
            f"| {group} | {count['met']} | {count['partial']} | {count['not_started']} | "
            f"{count['met'] / len(mine):.0%} |"
        )
    return out


def build(folder: Path = FOLDER) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for part in sorted((folder / "parts").glob("*.json")):
        for row in json.loads(part.read_text()):
            row["part"] = part.stem
            row["kind"] = row.get("kind") if row.get("kind") in KINDS else "product"
            rows.append(row)
    (folder / "register.json").write_text(json.dumps(rows, indent=1) + "\n")
    count = Counter(r["status"] for r in rows)
    lines = [
        "# Requirements register",
        "",
        "Every requirement in the project's own documents and in the founder's decisions, "
        "checked against the repository by agents that did not build it. A requirement is "
        "met only when a file or a test is named that proves it.",
        "",
        f"Audited {rows[0].get('audited_on', '2026-09-29')}. {len(rows)} requirements.",
        "",
        "| Status | Count |",
        "|---|---|",
        *[f"| {NAMES[s]} | {count[s]} |" for s in STATUSES],
        "",
        f"Of the {len(in_scope(rows))} that the first version must hold, "
        f"{count['met']} are met: {share_met(rows):.0%}.",
        "",
        "## By kind",
        "",
        *table(rows, "kind", KINDS),
        "",
        "## By document",
        "",
        *table(rows, "part", ()),
        "",
        "## How to use this",
        "",
        "- Before writing a SPEC, read the rows for its area in register.json.",
        '- Every SPEC names the requirement ids it covers, under the heading "Covers", and '
        "says what share of the whole that is.",
        "- When work lands, the rows it covers are audited again by an agent that did not "
        "build it, and this file is built again.",
        "- `uv run python -m tools.requirements.register check` runs in gate 7.",
        "",
    ]
    (folder / "REGISTER.md").write_text("\n".join(lines))
    return rows


def spec_problems(root: Path, rows: list[dict[str, Any]], since: str = "specs/path-1") -> list[str]:
    """A SPEC written from now on must say what it covers. Earlier ones are left as they are."""
    known = {r["id"] for r in rows}
    found = []
    for spec in sorted((root / "specs").glob("*/SPEC*.md")):
        rel = spec.relative_to(root).as_posix()
        if rel < since or rel.startswith(
            ("specs/phase-", "specs/product-1", "specs/desktop-1", "specs/factory")
        ):
            continue
        text = spec.read_text()
        if not re.search(r"(?m)^## Covers\s*$", text):
            found.append(f"{rel}: has no section named Covers")
            continue
        body = text.split("## Covers", 1)[1].split("\n## ", 1)[0]
        ids = set(re.findall(r"\b[A-Z][A-Z0-9]*(?:-D\d+)?-\d{3}\b", body))
        if not ids:
            found.append(f"{rel}: Covers names no requirement")
        found += [f"{rel}: {i} is not in the register" for i in sorted(ids - known)]
        if not re.search(r"\d+ of \d+", body):
            found.append(f"{rel}: Covers does not say what share of the whole it is")
    return found


def main() -> int:
    command = sys.argv[1] if len(sys.argv) > 1 else "check"
    if command == "build":
        rows = build()
        print(f"register: {len(rows)} requirements, {share_met(rows):.0%} of the first version met")
    path = FOLDER / "register.json"
    if not path.exists():
        print("register: docs/requirements/register.json is missing")
        return 1
    rows = json.loads(path.read_text())
    found = problems(rows) + spec_problems(REPO_ROOT, rows)
    for problem in found[:30]:
        print(problem)
    if found:
        print(f"register: {len(found)} problem(s)")
        return 1
    print(f"register: {len(rows)} requirements, whole")
    return 0


if __name__ == "__main__":
    sys.exit(main())
