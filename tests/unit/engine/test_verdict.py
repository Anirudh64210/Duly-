from datetime import UTC, date, datetime, timedelta

from hypothesis import given
from hypothesis import strategies as st

from engine.clocks import FixedClock
from engine.verdict import RULES_STALE_AFTER, VerdictInputs, VerdictState, decide

NOW = FixedClock(datetime(2026, 9, 28, 12, 0, tzinfo=UTC))
TODAY = date(2026, 9, 28)

names = st.lists(st.text(alphabet="abcdefgh_", min_size=1, max_size=8), max_size=3).map(tuple)
inputs = st.builds(
    VerdictInputs,
    documents_count=st.integers(min_value=0, max_value=50),
    missing_inputs=names,
    conflicting_inputs=names,
    rules_checked_on=st.one_of(st.none(), st.dates(min_value=date(2026, 1, 1), max_value=TODAY)),
    depends_on_litigated_rule=st.booleans(),
    judgement_items=names,
    open_items=names,
)


def clean(**changes):
    base = {
        "documents_count": 3,
        "missing_inputs": (),
        "conflicting_inputs": (),
        "rules_checked_on": TODAY,
        "depends_on_litigated_rule": False,
        "judgement_items": (),
        "open_items": (),
    }
    return VerdictInputs(**{**base, **changes})


def knows_enough(i: VerdictInputs) -> bool:
    return (
        i.documents_count > 0
        and not i.missing_inputs
        and not i.conflicting_inputs
        and i.rules_checked_on is not None
        and TODAY - i.rules_checked_on <= RULES_STALE_AFTER
        and not i.depends_on_litigated_rule
    )


@given(inputs)
def test_the_quiet_state_is_never_a_fallback(i):
    verdict = decide(i, NOW)
    if verdict.state is VerdictState.NO_OPEN_ITEMS:
        assert knows_enough(i)
        assert not i.open_items
        assert not i.judgement_items


@given(inputs)
def test_not_knowing_wins_over_everything(i):
    verdict = decide(i, NOW)
    if not knows_enough(i):
        assert verdict.state is VerdictState.CANNOT_TELL
        assert verdict.reasons


@given(inputs)
def test_same_inputs_same_verdict(i):
    assert decide(i, NOW) == decide(i, NOW)


def test_empty_case_cannot_tell():
    verdict = decide(clean(documents_count=0, rules_checked_on=None), NOW)
    assert verdict.state is VerdictState.CANNOT_TELL
    assert set(verdict.reasons) == {"no_documents", "rules_never_checked"}


def test_clean_case_has_no_open_items():
    assert decide(clean(), NOW).state is VerdictState.NO_OPEN_ITEMS


def test_open_item_needs_you():
    verdict = decide(clean(open_items=("report_employer",)), NOW)
    assert verdict.state is VerdictState.NEEDS_YOU
    assert verdict.reasons == ("report_employer",)


def test_judgement_item_goes_to_dso_even_with_open_items():
    verdict = decide(clean(open_items=("a",), judgement_items=("degree_relation",)), NOW)
    assert verdict.state is VerdictState.TALK_TO_DSO


def test_rules_on_the_stale_edge():
    edge = TODAY - RULES_STALE_AFTER
    assert decide(clean(rules_checked_on=edge), NOW).state is VerdictState.NO_OPEN_ITEMS
    past = edge - timedelta(days=1)
    verdict = decide(clean(rules_checked_on=past), NOW)
    assert verdict.state is VerdictState.CANNOT_TELL
    assert verdict.reasons == ("rules_stale",)


def test_litigated_rule_cannot_tell():
    verdict = decide(clean(depends_on_litigated_rule=True), NOW)
    assert verdict.reasons == ("rule_in_litigation",)


def test_missing_and_conflicting_inputs_are_named():
    verdict = decide(clean(missing_inputs=("ead",), conflicting_inputs=("program_end",)), NOW)
    assert verdict.reasons == ("missing:ead", "conflict:program_end")


# specs/step-w/SPEC-W2-UNKNOWN.md point 37: one verdict function. engine/path.py compute decides
# through engine/verdict.decide, and the new reason prefixes (missing:, unreadable:,
# undecided:, point 35) are blockers there: a verdict is never no_open_items, needs_you or
# talk_to_dso while any question is open.


def test_point_37_path_compute_decides_through_verdict_decide():
    # Fails while path.py decides on its own (path.py:1412-1436 at 07196cd).
    import ast
    from pathlib import Path

    source = (Path(__file__).resolve().parents[3] / "engine" / "path.py").read_text()
    tree = ast.parse(source)
    imports = {
        alias.name
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and node.module == "engine.verdict"
        for alias in node.names
    }
    assert "decide" in imports
    assert any(
        isinstance(n, ast.Call) and getattr(n.func, "id", "") == "decide" for n in ast.walk(tree)
    )


@given(inputs, st.sampled_from(["unreadable:w1.hours_per_week", "undecided:p1.end_date"]))
def test_point_37_the_new_prefixes_are_blockers(i, question):
    # Point 35: unreadable: and undecided: are blockers like missing:, so the verdict is
    # cannot_tell. Passed to decide as an open question (VerdictInputs.open_questions; the
    # SPEC fixes no other field for them), the reasons still name the record and field.
    from dataclasses import replace

    verdict = decide(replace(i, open_questions=(question,)), NOW)
    assert verdict.state == VerdictState.CANNOT_TELL
    assert any(question.split(":", 1)[1] in r for r in verdict.reasons)


def test_point_37_an_open_question_never_leaves_a_quiet_or_dso_verdict():
    for q in ("missing:p1.start_date", "unreadable:a1.type", "undecided:w3.end"):
        verdict = decide(clean(open_questions=(q,), judgement_items=("e1.e_verify.not_sure",)), NOW)
        assert verdict.state == VerdictState.CANNOT_TELL
