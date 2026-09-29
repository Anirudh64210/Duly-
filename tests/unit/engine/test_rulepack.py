import copy

import pytest

from engine.rulepack import RulepackError, load_all, validate_pack

SOURCE = {
    "citation": "8 CFR 214.2(f)(10)(ii)(E)",
    "url": "https://www.ecfr.gov/current/title-8/section-214.2",
    "checked_on": "2026-09-28",
}
PARAM = {
    "id": "opt.unemployment_limit",
    "value": 90,
    "unit": "days",
    "status": "settled",
    "effective_from": "2008-04-08",
    "source": SOURCE,
}
PACK = {
    "category": "f1",
    "jurisdiction": "us",
    "version": "v2026.09",
    "regimes": [
        {
            "id": "fixed_admission_2026",
            "legal_status": "enjoined",
            "operative": False,
            "source": SOURCE,
        }
    ],
    "parameters": [PARAM],
}


def pack(**changes):
    return {**copy.deepcopy(PACK), **changes}


def param(**changes):
    return {**copy.deepcopy(PARAM), **changes}


def test_shipped_packs_cover_every_category_and_load():
    packs = load_all()
    assert {p.category for p in packs} == {"f1", "h1b", "o1", "eb1a"}


def test_valid_pack_loads():
    loaded = validate_pack(pack())
    assert loaded.parameters[0]["value"] == 90
    assert loaded.regimes[0]["operative"] is False


def test_parameter_without_source_is_refused():
    bad = param()
    del bad["source"]
    with pytest.raises(RulepackError, match="source"):
        validate_pack(pack(parameters=[bad]))


def test_source_must_be_https():
    bad = param(source={**SOURCE, "url": "http://example.com"})
    with pytest.raises(RulepackError):
        validate_pack(pack(parameters=[bad]))


def test_unknown_status_tag_is_refused():
    with pytest.raises(RulepackError):
        validate_pack(pack(parameters=[param(status="probably")]))


@pytest.mark.parametrize("status", ["settled", "guidance", "litigated", "proposed", "school"])
def test_all_five_status_tags_load(status):
    assert validate_pack(pack(parameters=[param(status=status)]))


def test_unknown_regime_is_refused():
    with pytest.raises(RulepackError, match="unknown regime"):
        validate_pack(pack(parameters=[param(regime="nope")]))


def test_known_regime_loads():
    assert validate_pack(pack(parameters=[param(regime="fixed_admission_2026")]))


def test_overlapping_dates_are_refused():
    a = param(effective_to="2026-12-31")
    b = param(effective_from="2026-06-01", value=60)
    with pytest.raises(RulepackError, match="overlap"):
        validate_pack(pack(parameters=[a, b]))


def test_open_ended_then_later_is_an_overlap():
    a = param()
    b = param(effective_from="2026-06-01", value=60)
    with pytest.raises(RulepackError, match="overlap"):
        validate_pack(pack(parameters=[a, b]))


def test_back_to_back_dates_load():
    a = param(effective_to="2026-05-31")
    b = param(effective_from="2026-06-01", value=60)
    assert len(validate_pack(pack(parameters=[a, b])).parameters) == 2


def test_same_dates_in_two_regimes_load():
    a = param()
    b = param(regime="fixed_admission_2026", value=30)
    assert len(validate_pack(pack(parameters=[a, b])).parameters) == 2


def test_duplicate_is_refused():
    with pytest.raises(RulepackError, match="duplicate"):
        validate_pack(pack(parameters=[param(), param()]))


def test_end_before_start_is_refused():
    with pytest.raises(RulepackError, match="ends before"):
        validate_pack(pack(parameters=[param(effective_to="2001-01-01")]))


def test_unknown_field_is_refused():
    with pytest.raises(RulepackError):
        validate_pack(pack(parameters=[param(confidence="high")]))
