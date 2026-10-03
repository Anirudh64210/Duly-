"""Hidden tests for SPEC-W2-UNKNOWN (specs/step-w/SPEC-W2-UNKNOWN.md point 51 twins, and P2j of
point 46). Never shown to the lanes that build. Twins move the review inputs to other dates, so an
engine fitted to the unit examples' dates fails here. P2j: every journey of
tests/unit/acceptance/test_journeys.py, every present field, every gap state, with fills
{v, one other readable value, NONE or NOT_YET where allowed}; (a), and (b) and (c) where a fill
changes an output. Deterministic, no Hypothesis.

Hand working for the twins, today 2027-03-15 (a Monday):
- STEM job twin of R2: w2 starts 2027-01-04; 10 days on is 2027-01-14.
- R6 twin: p1 ends 2026-12-15; a1 card 2027-01-04 to 2028-01-03. Days 2027-01-04 to 2027-03-15
  inclusive: January 28 (4 to 31), February 28 (2027 not a leap year), March 15, so 71.
"""

from collections.abc import Callable
from datetime import date, timedelta
from typing import Any

import pytest

from tests.support import gaps
from tests.support.w2_pack import compute, f1_pack, items, rec
from tests.unit.engine.test_w2_windows import f1_case

TODAY = date(2027, 3, 15)
PACK = f1_pack()


def twin_r6(*extra: dict[str, Any]) -> list[dict[str, Any]]:
    p1 = rec(
        "p1",
        "program",
        where="us_on_f1",
        level="master",
        stem_list="on_list",
        start_date="2025-01-10",
        end_date="2026-12-15",
        state="completed",
    )
    a1 = rec(
        "a1",
        "authorization",
        type="opt_post_completion",
        program="p1",
        decision="approved",
        dso_on="2026-11-01",
        filed_on="2026-11-10",
        card_start="2027-01-04",
        card_end="2028-01-03",
    )
    return [p1, a1, *extra]


def test_twin_working():
    assert (date(2027, 3, 15) - date(2027, 1, 4)).days + 1 == 71
    assert date(2027, 1, 4) + timedelta(days=10) == date(2027, 1, 14)


def test_twin_r6_a_card_with_no_type_keeps_a1_s_count():
    a3 = rec(
        "a3",
        "authorization",
        program="p1",
        decision="approved",
        card_start="2027-01-04",
        card_end="2027-06-30",
    )
    out = compute(f1_case(twin_r6(a3), TODAY), [PACK], TODAY)
    assert items(out)["unemployment.opt_card.a1"]["value"] == 71
    assert gaps.question(out, "a3.type") is not None


@pytest.mark.parametrize("hours", ["40", "forty", True, "not_sure"])
def test_twin_r8_unknown_hours_withhold_the_count(hours):
    w1 = rec(
        "w1",
        "work",
        confirmed_on="2027-03-15",
        under="a1",
        start="2027-02-01",
        hours_per_week=hours,
    )
    out = compute(f1_case(twin_r6(w1), TODAY), [PACK], TODAY)
    shown = items(out)["unemployment.opt_card.a1"]
    assert shown["value"] is None
    assert "w1.hours_per_week" in shown.get("waits_on", [])


@pytest.mark.parametrize("start", ["20270201", "2027-W05-1", "2027W051"])
def test_twin_r38_basic_and_week_dates_are_unreadable(start):
    # R38 twin: 2027-W05-1 is Monday 2027-02-01 to fromisoformat; never read as that day.
    w1 = rec(
        "w1",
        "work",
        confirmed_on="2027-03-15",
        under="a1",
        start=start,
        end="2027-02-28",
        hours_per_week=40,
    )
    out = compute(f1_case(twin_r6(w1), TODAY), [PACK], TODAY)
    assert "unreadable:w1.start" in out["verdict"]["reasons"]
    assert items(out)["unemployment.opt_card.a1"]["value"] is None


def test_twin_r23_list_not_whole():
    case = f1_case(twin_r6(), TODAY)
    del case["complete"]["authorization"]
    out = compute(case, [PACK], TODAY)
    assert items(out)["stem.extensions.all"]["value"] is None


def _journeys() -> list[tuple[str, Callable[[], dict[str, Any]]]]:
    from tests.unit.acceptance import test_journeys as j

    return [(n, getattr(j, n)) for n in sorted(dir(j)) if n[0] == "j" and n[1:].isdigit()]


@pytest.mark.parametrize(("name", "build"), _journeys(), ids=[n for n, _ in _journeys()])
def test_p2j_every_journey_every_field_every_gap(name, build):
    # P2j (point 46): exhaustive over fields and gap states on each journey. Fails for an
    # engine that turns an unknown into one fixed fill.
    from engine.path import compute as path_compute
    from tests.support.records_case import CLOCK

    case = build()
    from engine.rulepack import load_all

    packs = load_all()
    base = path_compute(case, packs, CLOCK)
    pack = next(p for p in packs if p.category in case["categories"] and p.path)
    run = gaps.run_of(case)
    for rid, field in gaps.present_fields(pack, case):
        decl = gaps.decl_of(pack, run[rid], field)
        original = next(r for r in case["records"] if r["id"] == rid)["fields"][field]
        values = [v for v in gaps.fills(decl, case, base, pack, run) if v != original]
        fill_set = [original, *values[:1]]
        if None in values:
            fill_set.append(None)
        filled = [
            path_compute(gaps.with_field(case, rid, field, v), packs, CLOCK) for v in fill_set
        ]
        # Point 6 compares the values a fact can take consistently with the rest of the record.
        # A fill that makes a new conflict on this record (a return in 1950 before the trip
        # left) is a contradiction, not such a value; conflicts have their own tests.
        before = {r for r in base["verdict"]["reasons"] if r.startswith("conflict:")}
        filled = [
            out
            for out in filled
            if not any(
                r.startswith("conflict:")
                and r not in before
                and rid in r.removeprefix("conflict:").split(".")
                for r in out["verdict"]["reasons"]
            )
        ]
        for state, raw in gaps.gap(decl, run):
            held = path_compute(gaps.with_field(case, rid, field, raw), packs, CLOCK)
            for out in filled:
                for key, value in gaps.known_outputs(held).items():
                    assert gaps.outputs(out).get(key) == value, (name, rid, field, state, key)
            first = gaps.outputs(filled[0])
            changed = {
                k
                for out in filled
                for k, v in gaps.outputs(out).items()
                if k != "reasons" and first.get(k) != v
            }
            if changed:
                assert gaps.question(held, f"{rid}.{field}") is not None, (name, rid, field)
