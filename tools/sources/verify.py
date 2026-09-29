"""Check every rule's quote against the saved copy of its source.

A rule may only enter a pack if its exact words can be found in a saved copy of a
primary source, and the saved copy has not changed since.

Usage: uv run python -m tools.sources.verify [rulepacks/f1-us]
"""

import hashlib
import html
import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
NEEDS_QUOTE = {"settled", "guidance", "litigated", "proposed"}
PRIMARY_HOSTS = (
    "www.ecfr.gov",
    "www.federalregister.gov",
    "www.govinfo.gov",
    "www.uscis.gov",
    "studyinthestates.dhs.gov",
    "www.ice.gov",
    "travel.state.gov",
    "www.whitehouse.gov",
    "www.courtlistener.com",
    "www.reginfo.gov",
    "www.dol.gov",
    "flag.dol.gov",
    "uscode.house.gov",
)


def plain(text: str) -> str:
    """Tags out, entities decoded, whitespace and quote marks made uniform."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    for code in (0x2018, 0x2019):
        text = text.replace(chr(code), "'")
    for code in (0x201C, 0x201D):
        text = text.replace(chr(code), '"')
    for code in range(0x2010, 0x2016):
        text = text.replace(chr(code), "-")
    return re.sub(r"\s+", " ", text).strip().lower()


def check_pack(pack_file: Path) -> list[str]:
    problems: list[str] = []
    folder = pack_file.parent
    data = yaml.safe_load(pack_file.read_text())
    rows = [
        ("parameter " + p["id"], p.get("status", ""), p["source"])
        for p in data.get("parameters", [])
    ]
    rows += [("regime " + r["id"], "litigated", r["source"]) for r in data.get("regimes", [])]
    for label, status, source in rows:
        host = re.sub(r"^https://([^/]+)/.*$", r"\1", source.get("url", ""))
        if status in NEEDS_QUOTE and host not in PRIMARY_HOSTS:
            problems.append(f"{label}: {host} is not a primary source")
        if status not in NEEDS_QUOTE:
            continue
        quote, snapshot = source.get("quote"), source.get("snapshot")
        if not quote or not snapshot or not source.get("snapshot_sha256"):
            problems.append(f"{label}: needs quote, snapshot, and snapshot_sha256")
            continue
        path = folder / snapshot
        if not path.exists():
            problems.append(f"{label}: saved copy {snapshot} is missing")
            continue
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != source["snapshot_sha256"]:
            problems.append(f"{label}: saved copy {snapshot} has changed since it was recorded")
            continue
        if plain(quote) not in plain(raw.decode("utf-8", errors="replace")):
            problems.append(f"{label}: quote not found in {snapshot}")
    return problems


def main() -> int:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO_ROOT / "rulepacks"
    files = sorted(base.glob("**/parameters.yaml"))
    problems = [
        f"{f.relative_to(base.parent if base.is_dir() else base)}: {p}"
        for f in files
        for p in check_pack(f)
    ]
    for problem in problems:
        print(problem)
    if problems:
        print(f"sources: {len(problems)} problem(s)")
        return 1
    print(f"sources: {len(files)} pack(s) checked, every quote found")
    return 0


if __name__ == "__main__":
    sys.exit(main())
