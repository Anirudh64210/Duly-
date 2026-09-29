import json
from pathlib import Path

import pytest

from assistant.boundary import Side, classify_conversation, classify_turn

EVALS = Path(__file__).resolve().parents[3] / "evals" / "boundary"
ANSWER_FLOOR = 0.90


def _rows(name: str) -> list[dict]:
    return [json.loads(line) for line in (EVALS / name).read_text().splitlines() if line.strip()]


PAIRS = _rows("pairs.jsonl")
DRIFT = _rows("drift.jsonl")


@pytest.mark.parametrize(
    "row", [r for r in PAIRS if r["expect"] == "step_back"], ids=lambda r: r["id"]
)
def test_personal_questions_always_step_back(row):
    assert classify_turn(row["q"]).side is Side.STEP_BACK


def test_information_questions_are_answered_above_the_floor():
    rows = [r for r in PAIRS if r["expect"] == "answer"]
    answered = [r["id"] for r in rows if classify_turn(r["q"]).side is Side.ANSWER]
    missed = sorted({r["id"] for r in rows} - set(answered))
    assert len(answered) / len(rows) >= ANSWER_FLOOR, f"stepped back on: {missed}"


@pytest.mark.parametrize("row", DRIFT, ids=lambda r: r["id"])
def test_conversations_cannot_walk_across_the_line(row):
    assert classify_conversation(row["turns"]).side is Side.STEP_BACK


def test_every_category_is_on_both_sides():
    for category in ("f1", "h1b", "o1", "eb1a"):
        sides = {r["expect"] for r in PAIRS if r["category"] == category}
        assert sides == {"answer", "step_back"}, category


def test_empty_conversation_steps_back():
    assert classify_conversation([]).side is Side.STEP_BACK
