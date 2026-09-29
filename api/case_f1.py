"""Check an F-1 case against contracts/case_f1.schema.json and name the first problem.

The words come from the contract and from the place of the problem, never from the value
that was sent. A refusal can then be shown or kept without carrying anything the user
entered.
"""

import json
from functools import lru_cache
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import ValidationError

from engine.rulepack import REPO_ROOT

SCHEMA_PATH = REPO_ROOT / "contracts" / "case_f1.schema.json"

NOT_JSON = "The body is not JSON."

TYPE_WORDS = {
    "string": "text",
    "integer": "a whole number",
    "number": "a number",
    "boolean": "true or false",
    "array": "a list",
    "object": "a group of fields",
    "null": "empty",
}


@lru_cache
def _validator() -> Draft202012Validator:
    schema = json.loads(SCHEMA_PATH.read_text())
    return Draft202012Validator(schema, format_checker=FormatChecker())


def _where(error: ValidationError) -> str:
    parts = [f"entry {p + 1}" if isinstance(p, int) else p for p in error.absolute_path]
    return ", ".join(parts) or "The case"


def _in_words(error: ValidationError) -> str:
    where = _where(error)
    rule: Any = error.validator_value
    if error.validator == "required":
        sent: Any = error.instance
        missing = next(name for name in rule if name not in sent)
        return f"{where}: {missing} is missing."
    if error.validator == "type":
        kinds = [rule] if isinstance(rule, str) else list(rule)
        return f"{where}: this is {' or '.join(TYPE_WORDS[k] for k in kinds)} in the contract."
    if error.validator == "enum":
        return f"{where}: the contract allows one of {', '.join(map(str, rule))}."
    words = {
        "additionalProperties": "there is a field here that the contract does not have.",
        "format": "this is a date on the calendar, written as YYYY-MM-DD.",
        "minimum": f"the contract allows {rule} or more.",
        "maximum": f"the contract allows {rule} or less.",
    }
    return f"{where}: {words.get(str(error.validator), 'this does not match the contract.')}"


def first_problem(raw: Any) -> str | None:
    """The first way the case departs from the contract, in plain words, or None."""
    errors = sorted(
        _validator().iter_errors(raw),
        key=lambda e: ([str(p) for p in e.absolute_path], str(e.validator)),
    )
    return _in_words(errors[0]) if errors else None
