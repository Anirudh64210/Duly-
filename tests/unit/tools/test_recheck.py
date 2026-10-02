"""tools/sources/recheck.py (SPEC-FEED point 55, FEED-PA): a later checked_on is only ever
backed by a fresh fetch, a changed copy is kept beside the original for review, and a source
that could not be fetched supports nothing."""

import datetime as dt
import hashlib
import json
from pathlib import Path

import pytest

from tools.sources import recheck

SAME = b"<xml>the words of the rule</xml>"
ECFR_URL = (
    "https://www.ecfr.gov/api/versioner/v1/full/2026-09-14/title-8.xml?part=214&section=214.2"
)
PAGE_URL = "https://studyinthestates.dhs.gov/opt"
PDF_URL = "https://storage.courtlistener.com/recap/order.pdf"
NOW = dt.datetime(2026, 10, 2, 9, 0, tzinfo=dt.UTC)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def make_pack(tmp_path: Path, checked_on: str = "2026-09-28") -> Path:
    pack = tmp_path / "f1-us" / "v2026.09"
    (pack / "sources").mkdir(parents=True)
    (pack / "SOURCES.md").write_text(
        "| File in sources/ | What it is | Fetched from | sha256 |\n"
        "|---|---|---|---|\n"
        f"| ecfr.xml | 8 CFR 214.2 | {ECFR_URL} | {sha(SAME)} |\n"
        f"| page.html | the SEVP page | {PAGE_URL} | {sha(b'old page')} |\n"
        f"| order.pdf | an order | {PDF_URL} | {sha(b'pdf')} |\n"
        f"| order.txt | Text extracted from the PDF above | extracted locally | {sha(b'txt')} |\n"
    )
    (pack / "parameters.yaml").write_text(
        "regimes:\n"
        "  - id: r1\n"
        f"    source: {{snapshot: sources/order.txt, checked_on: {checked_on}}}\n"
        "parameters:\n"
        "  - id: p1\n"
        f"    source: {{snapshot: sources/ecfr.xml, checked_on: {checked_on}}}\n"
        "  - id: p2\n"
        f"    source: {{snapshot: sources/page.html, checked_on: {checked_on}, quote: new page}}\n"
    )
    return pack


def fake_web(down: set[str] | None = None):
    pages = {
        ECFR_URL: SAME,
        PAGE_URL: b"new page",
        PDF_URL: b"pdf",
        recheck.ECFR_VERSIONS.format(title="8", part="214", section="214.2"): json.dumps(
            {"content_versions": [{"date": "2026-09-15"}, {"date": "2026-09-30"}]}
        ).encode(),
    }

    def get(url: str) -> tuple[int, bytes]:
        if down and url in down:
            return 503, b""
        return (200, pages[url]) if url in pages else (404, b"")

    return get


def test_only_fetched_copies_are_listed_and_extracted_text_is_left_out(tmp_path):
    files = [s.file for s in recheck.saved_sources(make_pack(tmp_path))]
    assert files == ["ecfr.xml", "page.html", "order.pdf"]


def test_a_fetch_records_same_and_changed_and_keeps_the_changed_copy_beside_the_original(
    tmp_path,
):
    pack = make_pack(tmp_path)
    out = recheck.fetch(pack, NOW, fake_web())
    rows = {r["file"]: r for r in json.loads(out.read_text())["rows"]}
    assert out.name == "recheck-2026-10-02.json"
    assert rows["ecfr.xml"]["same"] is True
    assert rows["page.html"]["same"] is False
    assert rows["page.html"]["saved_as"] == "sources/recheck-2026-10-02/page.html"
    assert (pack / "sources/recheck-2026-10-02/page.html").read_bytes() == b"new page"
    assert not (pack / "sources/page.html").exists()  # the original is never written over
    # The pinned eCFR text is the same bytes, so the versions list is what shows a change.
    assert rows["ecfr.xml"]["ecfr"] == {
        "pinned": "2026-09-14",
        "status": 200,
        "latest": "2026-09-30",
        "newer": True,
    }


def test_a_source_that_could_not_be_fetched_is_recorded_and_supports_nothing(tmp_path):
    pack = make_pack(tmp_path, checked_on="2026-10-02")
    recheck.fetch(pack, NOW, fake_web(down={PDF_URL}))
    problems = recheck.check(pack)
    assert problems == ["r1: checked_on 2026-10-02 has no fresh fetch of order.txt on or after it"]


def test_a_later_checked_on_needs_a_fetch_on_or_after_it(tmp_path):
    pack = make_pack(tmp_path, checked_on="2026-10-02")
    assert len(recheck.check(pack)) == 3  # no recheck yet
    recheck.fetch(pack, NOW, fake_web())
    assert recheck.check(pack) == []  # same, changed-and-kept, and the PDF behind the text


def test_a_fetch_before_the_checked_on_does_not_support_it(tmp_path):
    pack = make_pack(tmp_path, checked_on="2026-10-05")
    recheck.fetch(pack, NOW, fake_web())
    assert len(recheck.check(pack)) == 3


def test_a_checked_on_from_the_hand_review_needs_no_recheck(tmp_path):
    assert recheck.check(make_pack(tmp_path, checked_on="2026-09-30")) == []


@pytest.mark.parametrize("argv", [["--check"], ["--fetch", "--check", "x"]])
def test_the_command_takes_one_mode_and_a_pack(argv):
    with pytest.raises(SystemExit):
        recheck.main(argv)


def test_a_changed_copy_without_the_quote_backs_nothing(tmp_path):
    # uscode.house.gov answered 200 with house.gov's home page on 2026-10-02.
    pack = make_pack(tmp_path, checked_on="2026-10-02")
    params = (pack / "parameters.yaml").read_text().replace("quote: new page", "quote: the rule")
    (pack / "parameters.yaml").write_text(params)
    recheck.fetch(pack, NOW, fake_web())
    assert recheck.check(pack) == [
        "p2: checked_on 2026-10-02 has no fresh fetch of page.html on or after it"
    ]


def test_only_https_is_ever_opened():
    assert recheck.http_get("file:///etc/passwd") == (0, b"")
    assert recheck.http_get("http://example.com") == (0, b"")


def test_the_shipped_pack_passes_the_check():
    assert recheck.main(["--check", "rulepacks/f1-us/v2026.09"]) == 0
