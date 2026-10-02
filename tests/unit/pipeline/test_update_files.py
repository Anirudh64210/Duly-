"""Every update file, drafted or published, follows contracts/update.schema.json (SPEC-FEED
points 28 and 29): a draft in another shape could be approved and still never be shown. The
FEED-PA review found such a draft passing tests/unit/pipeline."""

import json
from pathlib import Path

import jsonschema
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA = json.loads((REPO_ROOT / "contracts" / "update.schema.json").read_text())
FILES = sorted(
    p
    for folder in ("pipeline/drafts", "pipeline/published")
    for p in (REPO_ROOT / folder).glob("*.json")
)


@pytest.mark.parametrize("path", FILES, ids=[p.name for p in FILES])
def test_every_update_file_follows_the_update_contract(path: Path) -> None:
    errors = [
        e.message
        for e in jsonschema.Draft202012Validator(SCHEMA).iter_errors(json.loads(path.read_text()))
    ]
    assert errors == [], f"{path.relative_to(REPO_ROOT)}: {errors}"


def test_the_check_reads_the_drafts() -> None:
    # Guards the glob: the appeal draft of FEED-PA is there to be checked.
    assert any(p.parent.name == "drafts" for p in FILES)
