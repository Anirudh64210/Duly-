import pytest

from assistant.boundary import Sentence, validate_answer

SOURCES = {"cfr-214.2-f-10", "sevp-opt-guidance"}


def check(text, sources=("cfr-214.2-f-10",), numbers=frozenset({"90"})):
    return validate_answer([Sentence(text, tuple(sources))], SOURCES, set(numbers))


def test_a_cited_rule_statement_passes():
    assert check("Post-completion OPT allows 90 days of unemployment in total.").ok


@pytest.mark.parametrize(
    "text",
    [
        "You are eligible for the extension.",
        "You should apply before the window closes.",
        "You can keep working until April.",
        "Your startup counts as employment.",
        "You're fine, there is plenty of time.",
        "This role qualifies under the rule.",
        "You are in status.",
        "We recommend filing early.",
        "There is nothing to worry about.",
        "You don't need to report this.",
    ],
)
def test_conclusions_about_the_user_are_rejected(text):
    result = check(text)
    assert not result.ok
    assert any("conclusion" in p for p in result.problems)


def test_sentence_without_source_is_rejected():
    assert not check("OPT allows 90 days of unemployment.", sources=()).ok


def test_unknown_source_is_rejected():
    assert not check("OPT allows 90 days of unemployment.", sources=("reddit",)).ok


def test_number_the_engine_did_not_produce_is_rejected():
    result = check("OPT allows 120 days of unemployment.")
    assert not result.ok
    assert any("120" in p for p in result.problems)


def test_numbers_inside_citations_are_not_values():
    assert check("The rule is at 8 CFR 214.2(f)(10), which allows 90 days.").ok


def test_empty_answer_passes_trivially():
    assert validate_answer([], SOURCES, set()).ok


@pytest.mark.parametrize(
    "text",
    [
        "See 8 U.S.C. 1182(a)(6)(C)(i) and INA 212(a), which allow 90 days.",
        "Form I-983 and notice PA-2026-05 apply, with 90 days.",
    ],
)
def test_other_citation_shapes_are_not_values(text):
    assert check(text).ok


def test_a_wrong_value_next_to_a_citation_is_still_caught():
    assert not check("8 CFR 214.2(f)(10) allows 60 days.").ok
