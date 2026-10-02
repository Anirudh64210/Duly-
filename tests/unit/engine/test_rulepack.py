import copy

import pytest

from engine.rulepack import RulepackError, load_all, validate_pack

SOURCE = {
    "citation": "8 CFR 214.2(f)(10)(ii)(E)",
    "url": "https://www.ecfr.gov/current/title-8/section-214.2",
    "checked_on": "2026-09-28",
    # Phase 2 SPEC, engine/rulepack.py: a settled, guidance, litigated, or proposed rule
    # without a quote is refused. Placeholder words for a test pack, not a source's.
    "quote": "placeholder words for a test pack",
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


# specs/step-w/SPEC-W2-UNKNOWN.md points 7a and 11: a pack fault is refused at load, with a
# one-line RulepackError naming the path, never read as unknown at compute. One toy pack per
# fault (tests/support/unknown_toy.py, nothing about F-1); each still follows the pack schema,
# so the refusal is validate_pack's own. Fails if validate_pack loads the faulty pack.


def _toy() -> dict:
    from tests.support.unknown_toy import pack_dict

    return pack_dict()


def _refused(raw: dict, *named: str) -> None:
    from tests.support.w2_pack import schema_problems

    assert schema_problems(raw) == [], schema_problems(raw)  # the schema takes it
    with pytest.raises(RulepackError) as refused:
        validate_pack(raw)
    message = str(refused.value)
    assert "\n" not in message.strip()  # one line
    for word in named:
        assert word in message, (word, message)


def _rule(raw: dict, rule_id: str) -> dict:
    return next(p for p in raw["parameters"] if p["id"] == rule_id)


def _stage(raw: dict, stage_id: str) -> dict:
    return next(s for s in raw["path"]["stages"] if s["id"] == stage_id)


def _check(raw: dict, check_id: str) -> dict:
    return next(c for c in raw["path"]["checks"] if c["id"] == check_id)


def _counter(raw: dict, counter_id: str) -> dict:
    return next(c for c in raw["path"]["counters"] if c["id"] == counter_id)


def _field(raw: dict, kind: str, field: str) -> dict:
    record = next(k for k in raw["path"]["records"] if k["id"] == kind)
    return next(f for f in record["fields"] if f["id"] == field)


def _course_check(*holds: dict) -> dict:
    return {
        "id": "fault",
        "for_each": {"record": "course"},
        "holds": list(holds),
        "rule_ids": ["toy.cap"],
    }


def test_point_11_the_toy_pack_and_every_shipped_pack_load():
    # Point 11: "every shipped pack still loads"; the toy pack is the base of every fault below,
    # so a refusal below is the fault's, not the base's.
    validate_pack(_toy())
    assert load_all()


def test_point_11_a_rule_amount_that_is_not_a_number_is_refused():
    raw = _toy()
    _rule(raw, "toy.before_days")["value"] = "twenty"
    _refused(raw, "toy.before_days")


def test_point_11_a_unit_the_engine_cannot_add_is_refused():
    # toy.cap is a count; a count cannot move a date.
    raw = _toy()
    _stage(raw, "course")["windows"][0]["opens"]["add"] = [{"rule": "toy.cap"}]
    _refused(raw, "toy.cap")


def test_point_11_a_month_day_rule_that_does_not_parse_is_refused():
    raw = _toy()
    _rule(raw, "toy.renewal_day")["value"] = "13-45"  # no month 13
    _refused(raw, "toy.renewal_day")


def test_point_11_a_level_operator_on_a_field_with_no_order_is_refused():
    raw = _toy()
    raw["path"]["checks"].append(_course_check({"field": "this.mode", "level_above": "day"}))
    _refused(raw, "mode")


def test_point_11_an_ordered_field_with_a_choice_the_order_does_not_rank_is_refused():
    raw = _toy()
    raw["path"]["order"][0]["ascending"] = ["low", "mid"]  # high is a choice, not ranked
    _refused(raw, "high")


def test_point_11_an_in_value_that_is_not_a_choice_is_refused():
    raw = _toy()
    raw["path"]["checks"].append(_course_check({"field": "this.mode", "in": ["evening"]}))
    _refused(raw, "evening")


def test_point_11_a_rule_id_the_pack_does_not_hold_is_refused():
    # Read today as a lapse at compute (point 11); refused at load instead.
    raw = _toy()
    _stage(raw, "course")["windows"][0]["closes"]["add"] = [{"rule": "toy.nowhere"}]
    _refused(raw, "toy.nowhere")


def test_point_11_a_qualifying_kind_without_two_date_fields_is_refused():
    raw = _toy()
    _counter(raw, "idle.card")["qualifying"] = {"record": "employer"}
    _refused(raw, "employer")


def test_point_11_a_not_qualifying_kind_without_two_date_fields_is_refused():
    raw = _toy()
    _counter(raw, "idle.chain")["not_qualifying"] = {"record": "employer"}
    _refused(raw, "employer")


def test_point_11_an_outer_path_where_no_outer_record_exists_is_refused():
    # card.cap has no for_each, so a selector inside it has no outer record.
    raw = _toy()
    _check(raw, "card.cap")["holds"].append(
        {"exists": {"record": "card", "where": [{"field": "this.course", "same_as": "outer.id"}]}}
    )
    _refused(raw, "outer")


def test_point_11_a_this_path_in_a_check_with_no_record_is_refused():
    raw = _toy()
    _check(raw, "card.cap")["holds"].append({"field": "this.type", "present": True})
    _refused(raw, "this")


def test_point_11_a_this_path_in_a_stage_with_no_record_is_refused():
    raw = _toy()
    raw["path"]["stages"].append(
        {
            "id": "loose",
            "label": "Loose",
            "entered_when": ["this.start"],
            "rule_ids": ["toy.definition"],
        }
    )
    _refused(raw, "this")


def test_point_11_a_first_field_of_the_wrong_kind_is_refused():
    raw = _toy()
    ends = _stage(raw, "course")["span"]["ends"]["earliest_of"][1]
    ends["first"]["field"] = "type"  # a choice, not a date
    _refused(raw, "type")


def test_point_11_a_history_from_of_the_wrong_kind_is_refused():
    raw = _toy()
    _field(raw, "course", "end")["history"]["from"] = "course"  # a link, not a date
    _refused(raw, "course")


def test_point_11_a_chain_link_of_the_wrong_kind_is_refused():
    raw = _toy()
    _counter(raw, "idle.chain")["scope"]["chain_link"] = "type"  # a choice, not a link
    _refused(raw, "type")


def test_point_11_a_when_absent_condition_on_a_conditional_field_is_refused():
    # Point 2a: a condition may not read a field whose own when_absent is an object.
    # card_start's when_absent is an object.
    raw = _toy()
    _field(raw, "card", "card_end")["when_absent"] = {
        "not_yet": [{"field": "this.card_start", "present": False}]
    }
    _refused(raw, "card_start")


@pytest.mark.parametrize("operator", ["window_opens", "window_closes"])
def test_point_11_a_window_operator_the_engine_does_not_work_is_refused(operator):
    # Logic map point 10: they give None today with no trace.
    raw = _toy()
    _stage(raw, "course")["windows"][1]["closes"] = {operator: "course.apply"}
    _refused(raw, operator)


def test_point_11_a_list_only_if_is_refused():
    # path.py compares a dict to a string and drops the list.
    raw = _toy()
    raw["path"]["lists"] = [{"id": "toy.list", "label": "List", "rule_ids": ["toy.definition"]}]
    _stage(raw, "course")["lists"] = [
        {"list": "toy.list", "only_if": [{"field": "this.online", "present": True}]}
    ]
    _refused(raw, "only_if")


def test_point_11_follows_and_gap_allowed_are_refused():
    raw = _toy()
    _stage(raw, "card")["follows"] = ["course"]
    _refused(raw, "follows")
    raw = _toy()
    _stage(raw, "card")["gap_allowed"] = {"rule": "toy.before_days"}
    _refused(raw, "gap_allowed")


# Point 7a: NONE stays F in a comparison, so a `not` over a comparison, or a check's holds
# comparison, on a field whose when_absent can give NONE is refused unless a present: true on
# that field guards it in the same all_of. course.follows declares none.


def test_point_7a_a_not_over_a_comparison_on_a_none_field_is_refused():
    raw = _toy()
    raw["path"]["checks"].append(
        _course_check({"not": {"field": "this.follows", "same_as": "this.id"}})
    )
    _refused(raw, "follows")


def test_point_7a_a_holds_comparison_on_a_none_field_is_refused():
    raw = _toy()
    raw["path"]["checks"].append(
        _course_check({"field": "this.follows", "differs_from": "this.id"})
    )
    _refused(raw, "follows")


def test_point_7a_a_conditional_none_field_is_linted_too():
    # card.employer is none on type plain (point 2a), so it can give NONE.
    raw = _toy()
    raw["path"]["checks"].append(
        {
            "id": "fault",
            "for_each": {"record": "card"},
            "holds": [{"field": "this.employer", "differs_from": "this.course"}],
            "rule_ids": ["toy.cap"],
        }
    )
    _refused(raw, "employer")


def test_point_7a_a_present_guard_in_the_same_all_of_loads():
    # The guarded form: present: true on the same field in the same all_of. Fails if the lint
    # refuses a pack that guards the comparison.
    raw = _toy()
    raw["path"]["checks"].append(
        _course_check(
            {
                "all_of": [
                    {"field": "this.follows", "present": True},
                    {"not": {"field": "this.follows", "same_as": "this.id"}},
                ]
            }
        )
    )
    validate_pack(raw)
