"""Fetch every saved primary source of a pack again and record what came back (SPEC-FEED
point 55, FEED-PA), and check that no rule claims a later check than a fetch supports.

A rule's checked_on may only move to a later day when its saved copy was fetched again on or
after that day and came back the same, or came back changed and was saved as a new copy for
review. Nothing here edits the pack: the content lane moves checked_on, and the founder signs
off on anything that changed.

Usage:
  uv run python -m tools.sources.recheck --fetch rulepacks/f1-us/v2026.09
      Outside the agents' jail: it needs the network. Writes recheck-<day>.json in the pack and
      any changed copy under sources/recheck-<day>/, beside the originals, never over them.
  uv run python -m tools.sources.recheck --check rulepacks/f1-us/v2026.09
      Fails when a checked_on later than REVIEWED_BY_HAND has no fresh fetch on or after it.
"""

import argparse
import datetime as dt
import gzip
import hashlib
import json
import re
import sys
import urllib.error
import urllib.request
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from tools.sources import verify

REPO_ROOT = Path(__file__).resolve().parents[2]

# The last day the F-1 pack was reviewed by hand, before any recheck existed. A checked_on on
# or before it rests on that review; a later one needs a recheck row.
REVIEWED_BY_HAND = dt.date(2026, 9, 30)

USER_AGENT = "Duly source recheck (public law text only)"
PINNED_ECFR = re.compile(
    r"https://www\.ecfr\.gov/api/versioner/v1/full/(\d{4}-\d{2}-\d{2})/title-(\d+)\.xml"
    r"\?part=(\d+)&section=([\d.]+)"
)
ECFR_VERSIONS = "https://www.ecfr.gov/api/versioner/v1/versions/title-{title}.json?part={part}&section={section}"
SHA256 = re.compile(r"[0-9a-f]{64}")

Fetcher = Callable[[str], tuple[int, bytes]]


@dataclass(frozen=True)
class Saved:
    """One row of SOURCES.md: the saved file, where it was fetched from, its sha256."""

    file: str
    url: str
    sha256: str


def saved_sources(pack: Path) -> list[Saved]:
    """The fetched copies SOURCES.md lists. Copies extracted locally have no url and are left
    out: they are checked through the file they were extracted from."""
    found: list[Saved] = []
    for line in (pack / "SOURCES.md").read_text().splitlines():
        if not line.startswith("| "):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 4 or not cells[2].startswith("https://"):
            continue
        if SHA256.fullmatch(cells[3]):
            found.append(Saved(file=cells[0], url=cells[2], sha256=cells[3]))
    return found


def http_get(url: str) -> tuple[int, bytes]:
    """The status and body; a failure is a status, never an exception, so one source down
    is recorded and the rest are still fetched."""
    if not url.startswith("https://"):
        return 0, b""  # only primary sources over https; never a file: or other scheme
    # eCFR answers 406 unless compression is allowed; the body is unpacked before hashing,
    # so it compares with the saved copy byte for byte.
    headers = {"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"}
    request = urllib.request.Request(url, headers=headers)  # noqa: S310
    try:
        with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 (https only)
            body = bytes(response.read())
            if response.headers.get("Content-Encoding", "").lower() == "gzip":
                body = gzip.decompress(body)
            return int(response.status), body
    except urllib.error.HTTPError as err:
        return int(err.code), b""
    except (urllib.error.URLError, TimeoutError, OSError):
        return 0, b""


def latest_ecfr_version(url: str, get: Fetcher) -> dict[str, Any] | None:
    """For a pinned eCFR url: the newest version date eCFR lists for that section."""
    match = PINNED_ECFR.fullmatch(url)
    if match is None:
        return None
    pinned, title, part, section = match.groups()
    status, body = get(ECFR_VERSIONS.format(title=title, part=part, section=section))
    if status != 200 or not body:
        return {"pinned": pinned, "status": status, "latest": None}
    try:
        versions = json.loads(body)["content_versions"]
        latest = max(str(v["date"]) for v in versions)
    except (ValueError, KeyError, TypeError):
        return {"pinned": pinned, "status": status, "latest": None}
    return {"pinned": pinned, "status": status, "latest": latest, "newer": latest > pinned}


def fetch(pack: Path, now: dt.datetime, get: Fetcher = http_get) -> Path:
    """Fetch every listed source once and write recheck-<day>.json in the pack."""
    day = now.date().isoformat()
    rows: list[dict[str, Any]] = []
    for saved in saved_sources(pack):
        status, body = get(saved.url)
        digest = hashlib.sha256(body).hexdigest() if body else ""
        row: dict[str, Any] = {
            "file": saved.file,
            "url": saved.url,
            "fetched_at": now.isoformat(timespec="seconds"),
            "status": status,
            "sha256": digest,
            "saved_sha256": saved.sha256,
            "same": status == 200 and digest == saved.sha256,
        }
        if status == 200 and body and digest != saved.sha256:
            copy = pack / "sources" / f"recheck-{day}" / saved.file
            copy.parent.mkdir(parents=True, exist_ok=True)
            copy.write_bytes(body)
            row["saved_as"] = copy.relative_to(pack).as_posix()
        ecfr = latest_ecfr_version(saved.url, get)
        if ecfr is not None:
            row["ecfr"] = ecfr
        rows.append(row)
    out = pack / f"recheck-{day}.json"
    # A second fetch the same day adds its rows; it never writes over the first one's record.
    earlier = json.loads(out.read_text()).get("rows", []) if out.exists() else []
    record = {"pack": pack.as_posix(), "day": day, "rows": [*earlier, *rows]}
    out.write_text(json.dumps(record, indent=2) + "\n")
    return out


def _sources(node: Any, label: str = "") -> Iterator[tuple[str, dict[str, Any]]]:
    """Every source block in a pack (a mapping with checked_on and snapshot), with the id of
    the nearest rule or regime around it."""
    if isinstance(node, dict):
        label = str(node.get("id", label))
        if "checked_on" in node and "snapshot" in node:
            yield label, node
        for value in node.values():
            yield from _sources(value, label)
    elif isinstance(node, list):
        for item in node:
            yield from _sources(item, label)


@dataclass(frozen=True)
class Fetched:
    """One good fetch of a saved file: its day, the sha256 of what came back, and the changed
    copy when it was not the same."""

    day: dt.date
    changed_copy: Path | None
    sha256: str = ""


def _fetches(pack: Path) -> dict[str, list[Fetched]]:
    """For each saved file, the recheck fetches that came back (status 200)."""
    found: dict[str, list[Fetched]] = {}
    for path in sorted(pack.glob("recheck-*.json")):
        for row in json.loads(path.read_text()).get("rows", []):
            if row.get("status") != 200 or not (row.get("same") or row.get("saved_as")):
                continue
            day = dt.datetime.fromisoformat(str(row["fetched_at"])).date()
            copy = None if row.get("same") else pack / str(row["saved_as"])
            fetched = Fetched(day, copy, str(row.get("sha256", "")))
            found.setdefault(str(row["file"]), []).append(fetched)
            # Also findable by its bytes: a rule may name the changed copy, saved under sources/
            # with its own name, by that copy's sha256 (SPEC-FEED point 55).
            if row.get("sha256"):
                # A changed copy found by its bytes still has to hold the rule's quote.
                found.setdefault(f"sha256:{row['sha256']}", []).append(Fetched(day, copy))
    return found


def _backs(fetched: Fetched, name: str, quote: str) -> bool:
    """A fetch backs a rule when it came back the same, or changed with the rule's quote still
    in it. A site can answer 200 with another page (uscode.house.gov served house.gov's home
    page on 2026-10-02), so a changed copy without the quote backs nothing. A changed PDF
    cannot be read here and backs nothing until it is extracted and reviewed."""
    if fetched.changed_copy is None:
        return True
    if not quote or name.endswith(".txt") or not fetched.changed_copy.exists():
        return False
    text = fetched.changed_copy.read_bytes().decode("utf-8", errors="replace")
    return verify.plain(quote) in verify.plain(text)


def check(pack: Path) -> list[str]:
    """The rules whose checked_on is later than any fetch supports."""
    data = yaml.safe_load((pack / "parameters.yaml").read_text())
    fetches = _fetches(pack)
    found: list[str] = []
    for label, source in _sources(data):
        checked = source["checked_on"]
        checked = checked if isinstance(checked, dt.date) else dt.date.fromisoformat(str(checked))
        if checked <= REVIEWED_BY_HAND:
            continue
        name = Path(str(source["snapshot"])).name
        rows = [
            *fetches.get(name, []),
            *fetches.get(re.sub(r"\.txt$", ".pdf", name), []),
            *fetches.get(f"sha256:{source.get('snapshot_sha256', '')}", []),
        ]
        quote = str(source.get("quote", ""))
        if not any(f.day >= checked and _backs(f, name, quote) for f in rows):
            found.append(
                f"{label}: checked_on {checked} has no fresh fetch of {name} on or after it"
            )
    return found


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="tools.sources.recheck")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--fetch", action="store_true")
    mode.add_argument("--check", action="store_true")
    parser.add_argument("pack")
    args = parser.parse_args(argv)
    pack = (REPO_ROOT / args.pack) if not Path(args.pack).is_absolute() else Path(args.pack)
    if args.fetch:
        out = fetch(pack, dt.datetime.now(dt.UTC))
        rows = json.loads(out.read_text())["rows"]
        changed = [r["file"] for r in rows if r["status"] == 200 and not r["same"]]
        failed = [f"{r['file']} ({r['status']})" for r in rows if r["status"] != 200]
        newer = [r["file"] for r in rows if r.get("ecfr", {}).get("newer")]
        print(f"recheck: {len(rows)} source(s) fetched into {out.name}")
        print(f"  the same: {len(rows) - len(changed) - len(failed)}")
        print(f"  changed, kept for review: {', '.join(changed) or 'none'}")
        print(f"  not fetched: {', '.join(failed) or 'none'}")
        print(f"  eCFR lists a newer version: {', '.join(newer) or 'none'}")
        return 0
    problems = check(pack)
    for problem in problems:
        print(problem)
    print("recheck: every later checked_on has a fresh fetch" if not problems else "")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
