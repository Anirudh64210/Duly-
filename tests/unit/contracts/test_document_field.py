"""K7: a record field may name the document it is typed from (SPEC-W2 point 44a, N7, D97(1)).

The pack fills it in W2-R1; these tests hold the contract's shape and keep its document kinds
equal to the documents bridge's, so a field can only name a kind the student can hold.
"""

import json
from typing import Any

import pytest
from jsonschema import Draft202012Validator

from engine.rulepack import REPO_ROOT

CONTRACTS = REPO_ROOT / "contracts"
PACK = json.loads((CONTRACTS / "rulepack.schema.json").read_text())
BRIDGE = json.loads((CONTRACTS / "desktop_documents_bridge.schema.json").read_text())


def field_validator() -> Draft202012Validator:
    schema = {"$ref": "#/$defs/record_field", "$defs": PACK["$defs"]}
    return Draft202012Validator(schema)


def test_the_document_kinds_are_the_bridges() -> None:
    # Fails if one list gains or loses a kind without the other.
    assert PACK["$defs"]["document_kind"]["enum"] == BRIDGE["$defs"]["kind"]["enum"]


@pytest.mark.parametrize(
    "document",
    [
        "i20",
        "ead_card",
        {
            "cases": [{"when": [{"field": "this.kind", "in": ["cpt"]}], "document": "i20"}],
            "else": "ead_card",
        },
        {"cases": [{"when": [{"field": "this.kind", "in": ["opt"]}], "document": "ead_card"}]},
    ],
)
def test_a_field_names_its_document_or_one_per_record(document: Any) -> None:
    field = {
        "id": "card_start",
        "kind": "date",
        "label": "The card's first day",
        "document": document,
    }
    assert list(field_validator().iter_errors(field)) == []


def test_a_field_with_no_document_still_validates() -> None:
    # A job's start comes from no document; it is asked once with its record.
    assert list(field_validator().iter_errors({"id": "start", "kind": "date", "label": "x"})) == []


@pytest.mark.parametrize(
    "document",
    [
        "drivers_license",
        {"cases": []},
        {"cases": [{"document": "i20"}]},
        {"cases": [{"when": [{"field": "this.kind", "in": ["cpt"]}], "document": "i20"}], "x": 1},
    ],
)
def test_a_document_outside_the_contract_is_refused(document: Any) -> None:
    field = {"id": "card_start", "kind": "date", "label": "x", "document": document}
    assert list(field_validator().iter_errors(field)) != []
