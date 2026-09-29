"""The plain words a pack carries are general, calm, readable and grounded (D56)."""

import yaml

from tools.sources import plain

QUOTE = (
    "Students may not accrue an aggregate of more than 90 days of unemployment during any "
    "post-completion OPT period described in 8 CFR 274a.12(c)(3)(i)(B)."
)
GOOD = (
    "During OPT after graduation, the rule allows up to 90 days in total without a job. "
    "Days with work that counts do not add to the total."
)


def test_plain_words_that_say_what_the_rule_says_pass():
    assert plain.problems(GOOD, "rule", QUOTE) == []
    assert plain.grade(GOOD) <= plain.GRADE


def test_words_about_a_person_a_conclusion_or_an_instruction_are_refused():
    found = plain.problems("You must file within 90 days.", "rule", QUOTE)
    assert any("speaks to a person" in p for p in found)
    assert any("concludes" in p for p in found)
    assert any(
        "instructs" in p for p in plain.problems("File the form within 90 days.", "rule", QUOTE)
    )


def test_alarm_words_are_refused():
    found = plain.problems("Going over 90 days can lead to deportation.", "rule", QUOTE)
    assert any("alarms" in p for p in found)


def test_a_number_the_rule_does_not_hold_is_refused():
    found = plain.problems("The rule allows up to 120 days without a job.", "rule", QUOTE)
    assert found == ["numbers not in the rule's own words: 120"]


def test_legal_prose_is_refused_as_too_hard_to_read():
    hard = (
        "Students must remain within the aggregate unemployment allowance delineated in the "
        "applicable regulatory framework governing practical training."
    )
    assert any("reading grade" in p for p in plain.problems(hard, "rule", QUOTE))


def test_too_many_sentences_are_refused():
    many = "The rule counts days. It counts days without a job. It stops at 90. That is all."
    assert any("4 sentences" in p for p in plain.problems(many, "rule", QUOTE))
    assert not any("sentences" in p for p in plain.problems(many, "regime", QUOTE))


def test_a_pack_is_checked_and_can_require_plain_words_everywhere(tmp_path):
    pack = {
        "category": "f1",
        "regimes": [{"id": "ds_2012", "source": {"quote": "q"}}],
        "parameters": [
            {
                "id": "opt.unemployment_limit_days",
                "value": 90,
                "source": {"quote": QUOTE},
                "plain": GOOD,
                "plain_terms": [],
            },
            {"id": "opt.max_months", "value": 12, "source": {"quote": "12 months"}},
        ],
    }
    folder = tmp_path / "f1-us" / "v1"
    folder.mkdir(parents=True)
    (folder / "parameters.yaml").write_text(yaml.safe_dump(pack))
    assert plain.main([str(tmp_path)]) == 0
    assert plain.main([str(tmp_path), "--require", "f1"]) == 1
    assert plain.check_pack(pack, True) == [
        "f1 regime ds_2012: no plain words",
        "f1 rule opt.max_months: no plain words",
    ]


def test_the_shipped_packs_hold_no_bad_plain_words():
    assert plain.main([]) == 0


def test_terms_of_art_are_kept_word_for_word():
    entry = {
        "id": "cpt.full_time_bar_days",
        "value": 365,
        "source": {"quote": "are ineligible for post-completion academic training"},
        "plain_terms": ["post-completion academic training"],
    }
    kept = "The rule says one year of full-time CPT rules out post-completion academic training."
    swapped = "The rule says one year of full-time CPT rules out practical training after study."
    assert plain.term_problems(entry, kept, True) == []
    assert plain.term_problems(entry, swapped, True) == [
        "term 'post-completion academic training' is not kept in the plain words"
    ]
    invented = {**entry, "plain_terms": ["OPT"]}
    assert plain.term_problems(invented, kept, True) == ["term 'OPT' is not in the quote"]
    assert plain.term_problems({**entry, "plain_terms": None}, kept, True)
    assert (
        plain.term_problems({k: v for k, v in entry.items() if k != "plain_terms"}, kept, False)
        == []
    )


def test_plain_words_leave_citations_and_legalese_to_the_exact_words():
    cited = (
        "During any post-completion OPT period described in 8 CFR 274a.12(c)(3)(i)(B), "
        "a student may not have more than 90 days of unemployment."
    )
    found = plain.problems(cited, "rule", QUOTE + " 8 274")
    assert any("cites" in p for p in found)
    assert any("legal phrasing" in p for p in found)
    accrued = "A student may not accrue an aggregate of more than 90 days of unemployment."
    assert any("legal phrasing" in p for p in plain.problems(accrued, "rule", QUOTE))


def test_terms_of_art_are_few_and_are_not_legal_phrasing():
    entry = {
        "id": "x",
        "source": {
            "quote": "may not accrue an aggregate of more than 90 days of unemployment "
            "by a U.S. worker"
        },
        "plain_terms": ["accrue an aggregate of", "U.S. worker"],
    }
    found = plain.term_problems(
        entry, "A U.S. worker may not have more than 90 days without a job.", True
    )
    assert found == [
        "term 'accrue an aggregate of' is a citation or legal phrasing, not a term of art"
    ]
    many = {**entry, "plain_terms": ["a", "b", "c", "d"]}
    assert any("at most 3" in p for p in plain.term_problems(many, "a b c d", True))


def test_an_abbreviation_does_not_end_a_sentence():
    # The review of fix 8: "U.S." was read as two sentence ends, and a text at a real grade of
    # 24 was scored under 9.
    one = (
        "The older degree must be from a U.S. educational institution that is accredited and "
        "SEVP-certified when the DSO recommends the student for the extension and must be in "
        "a category on the STEM list at that time and granted in the 10 years before that day."
    )
    assert len(plain._sentences(one)) == 1
    assert plain.grade(one) > plain.GRADE
    assert any("reading grade" in p for p in plain.problems(one, "rule", one))
    short = "The older degree must be from a U.S. school. The school must be accredited."
    assert len(plain._sentences(short)) == 2
