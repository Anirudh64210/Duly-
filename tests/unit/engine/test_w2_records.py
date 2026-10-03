"""W2-P2: the records the screens read. specs/step-w/SPEC-W2.md points 45 (P4 to P7), 46 (N3,
N4) and 50, gap map rows G8, G9, G10 and G17, D74, over contracts/engine_output.schema.json
(checkins[], watch[], as_of), contracts/rulepack.schema.json (path.watch, path.checkins) and
contracts/product_settings.yaml (K1: watch.close_days, checkin.job_days, checkin.petition_days).

- P4, G17 (D74): passport, visa and address records; the address report window from 8 CFR
  214.2(f)(17), "within 10 days of the change".
- P5, G9: the trip windows trip.absence_limit (travel.absence_months, 8 CFR 214.2(f)(4)) and
  trip.signature_covers (travel.opt_signature_months, 8 CFR 214.2(f)(13)(ii)).
- P6, N4, G10: watch[] with date, days_away and close; close is the setting watch.close_days,
  never a rule.
- P7, N3, G8: checkins[] from path.checkins and the K1 settings; a count that rests on a record
  checked in on stops at its last confirmed day and says so with as_of.
- Every gap follows SPEC-W2-UNKNOWN (D92): asked by name with its state (point 34), the output
  withheld with waits_on (point 33), never read as none unless the pack declares it (point 2).
- reviews/w2-p1.md finding 1 (should fix): a negative hours figure is read as unreadable and
  asked (point 35), never counted.

Every number a date is worked from is first read from the saved words of its source, then the
date is worked by hand beside the assertion. The SPEC names the window ids of G9 and the field
confirmed_on (G8); the ids, prefixes and date fields of the new record kinds are pack data
(point 44, K6), so they are read from the pack's declarations, never guessed. Outputs are checked
against contracts/engine_output.schema.json by tests.support.w2_pack.compute. Written before the
pack and the engine have these; they cannot pass yet.
"""

import calendar
import re
from datetime import date, timedelta
from functools import cache
from typing import Any

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from engine.settings import load_settings, whole_setting
from tests.support.w2_pack import (
    compute,
    f1_pack,
    items,
    number_in_saved_words,
    rec,
    saved_text,
    windows,
    windows_named,
)
from tools.sources.verify import plain

TODAY = date(2026, 10, 2)  # a Friday
SETTINGS = load_settings()
# K1 (SPEC-W2 point 39). The engine reads each from the file; pinned below.
CLOSE_DAYS = whole_setting(SETTINGS, "watch.close_days")
JOB_DAYS = whole_setting(SETTINGS, "checkin.job_days")
PETITION_DAYS = whole_setting(SETTINGS, "checkin.petition_days")
WORDS = {"five": 5, "six": 6, "ten": 10}
SLOW = settings(max_examples=25, deadline=None, suppress_health_check=[HealthCheck.too_slow])


@cache
def pack() -> Any:
    return f1_pack()


def number_in_words(rule_id: str, phrase: str) -> int:
    """As tests.support.w2_pack.number_in_saved_words, for a source that writes the number as a
    word (8 CFR 214.2(f)(4) "five", (f)(13)(ii) "six")."""
    rule = pack().value(rule_id, TODAY)
    assert rule is not None, f"{rule_id}: not in force on {TODAY}"
    quote = plain(rule["source"]["quote"])
    assert quote in saved_text(rule), f"{rule_id}: quote not in {rule['source']['snapshot']}"
    found = re.search(phrase, quote)
    assert found, f"{rule_id}: the saved words do not hold {phrase!r}"
    number = WORDS[found.group(1)]
    assert rule["value"] == number, f"{rule_id}: pack says {rule['value']}, words say {number}"
    return number


@cache
def absence_months() -> int:
    return number_in_words("travel.absence_months", r"temporary absence of (\w+) months or less")


@cache
def signature_months() -> int:
    return number_in_words(
        "travel.opt_signature_months",
        r"endorsed for reentry by the dso within the last (\w+) months",
    )


@cache
def address_rule() -> str:
    """The one rule in force citing 8 CFR 214.2(f)(17) (D74; SPEC-W2 point 45, P4)."""
    found: set[str] = {
        p["id"]
        for p in pack().parameters
        if "214.2(f)(17)" in p["source"]["citation"] and pack().value(p["id"], TODAY) is p
    }
    assert len(found) == 1, found
    return found.pop()


@cache
def address_days() -> int:
    return number_in_saved_words(
        pack(), address_rule(), r"any change of address, within (\d+) days of the change", TODAY
    )


def months_after(day: date, months: int) -> date:
    """The same day `months` later, on the month's last day where it has no such day
    (specs/path-1/programs.md 13 point 12, as the engine moves months)."""
    month0 = day.year * 12 + day.month - 1 + months
    year, month = divmod(month0, 12)
    last = calendar.monthrange(year, month + 1)[1]
    return date(year, month + 1, min(day.day, last))


def test_the_numbers_the_dates_are_worked_from_are_the_saved_words() -> None:
    # (f)(4): "a temporary absence of five months or less"; (f)(13)(ii): "endorsed for reentry
    # by the DSO within the last six months"; (f)(17): "any change of address, within 10 days of
    # the change". K1: watch.close_days 30, checkin.job_days 30, checkin.petition_days 30.
    assert (absence_months(), signature_months(), address_days()) == (5, 6, 10)
    assert (CLOSE_DAYS, JOB_DAYS, PETITION_DAYS) == (30, 30, 30)


# The pack's declarations (P4, P6, P7; contracts/rulepack.schema.json, K6).


def record_decl(kind: str) -> dict[str, Any]:
    found = [r for r in pack().path["records"] if r["id"] == kind]
    assert len(found) == 1, f"no record kind {kind} in the F-1 pack"
    one: dict[str, Any] = found[0]
    return one


def field_decl(kind: str, field: str) -> dict[str, Any]:
    found = [f for f in record_decl(kind)["fields"] if f["id"] == field]
    assert len(found) == 1, f"{kind}.{field}"
    one: dict[str, Any] = found[0]
    return one


def rid(kind: str, n: int = 1) -> str:
    """A record id under the kind's own id_prefix."""
    return f"{record_decl(kind)['id_prefix']}{n}"


def watched(kind: str) -> dict[str, Any]:
    """The pack's path.watch entry for this record kind (SPEC-W2 point 45, P6)."""
    found = [w for w in pack().path.get("watch", []) if w["record"] == kind]
    assert len(found) == 1, f"path.watch names {kind} {len(found)} times"
    one: dict[str, Any] = found[0]
    return one


def address_window() -> tuple[str, str]:
    """(window id, the address field it is dated from): the stage window over the address
    record whose close adds the (f)(17) rule (G17)."""
    found = []
    for stage in pack().path["stages"]:
        if stage.get("for_each", {}).get("record") != "address":
            continue
        for w in stage.get("windows", []):
            closes = w.get("closes", {})
            if {"rule": address_rule()} in closes.get("add", []):
                found.append((w["id"], closes["fact"].removeprefix("this.")))
    assert len(found) == 1, found
    return found[0]


def test_the_pack_declares_passport_visa_and_address_records() -> None:
    # SPEC-W2 point 45 (P4), D74: three new record kinds, each with its own id prefix and at
    # least one date field the person types from the document.
    for kind in ("passport", "visa", "address"):
        decl = record_decl(kind)
        assert re.fullmatch(r"[a-z]{1,3}", decl["id_prefix"]), decl["id_prefix"]
        assert any(f["kind"] == "date" for f in decl["fields"]), kind


def test_the_pack_names_the_dates_to_watch() -> None:
    # SPEC-W2 point 45 (P6), G10: card ends, passport and visa expiry, the Form I-20's end.
    # Each a date field of its kind, with rules that are in the pack and in force today.
    assert watched("authorization")["field"] == "card_end"
    assert watched("program")["field"] == "end_date"
    for kind in ("passport", "visa", "authorization", "program"):
        entry = watched(kind)
        assert field_decl(kind, entry["field"])["kind"] == "date"
        for rule_id in entry["rule_ids"]:
            assert pack().value(rule_id, TODAY) is not None, rule_id


def test_the_pack_names_the_check_ins_with_the_k1_settings() -> None:
    # SPEC-W2 point 45 (P7) and G8: confirmed_on on work and petition, each with its setting.
    got = {(c["record"], c["field"], c["setting"]) for c in pack().path.get("checkins", [])}
    assert got == {
        ("work", "confirmed_on", "checkin.job_days"),
        ("petition", "confirmed_on", "checkin.petition_days"),
    }
    for kind in ("work", "petition"):
        assert field_decl(kind, "confirmed_on")["kind"] == "date"


# The cases, on the shipped F-1 pack. A field the case does not give is left out.


def f1_case(records: list[dict[str, Any]], on: date = TODAY) -> dict[str, Any]:
    # SPEC-W2-UNKNOWN points 14 and 58 (D92): every record kind of the pack is stated whole (a
    # list is asked even with no complete_label: complete.withdrawal), so no list gap is in
    # play unless a test makes one.
    stated = {"on": on.isoformat()}
    lists = [r["id"] for r in pack().path["records"]]
    return {
        "categories": ["f1"],
        "time_zone": "UTC",
        "facts": {},
        "records": records,
        "complete": dict.fromkeys(lists, stated),
        "confirmations": {},
    }


def masters(end: str = "2026-05-15", state: str = "completed") -> dict[str, Any]:
    return rec(
        "p1",
        "program",
        where="us_on_f1",
        level="master",
        stem_list="on_list",
        end_date=end,
        state=state,
    )


def opt_card(start: str = "2026-06-01", end: str = "2027-05-31") -> dict[str, Any]:
    return rec(
        "a1",
        "authorization",
        type="opt_post_completion",
        program="p1",
        decision="approved",
        dso_on="2026-04-01",
        filed_on="2026-04-10",
        card_start=start,
        card_end=end,
    )


def job(**extra: Any) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "employer": "e1",
        "under": "a1",
        "start": "2026-07-01",
        "hours_per_week": 40,
    }
    fields.update(extra)
    return rec("w1", "work", **fields)


def on_opt(*more: dict[str, Any]) -> list[dict[str, Any]]:
    """Program end 2026-05-15; OPT card 2026-06-01 to 2027-05-31; employer e1."""
    return [masters(), opt_card(), rec("e1", "employer", name="Employer One"), *more]


def question(out: dict[str, Any], qid: str) -> dict[str, Any]:
    found = [q for q in out["questions"] if q["id"] == qid]
    assert len(found) == 1, [q["id"] for q in out["questions"]]
    one: dict[str, Any] = found[0]
    return one


def assert_asked(out: dict[str, Any], record: str, field: str, state: str) -> None:
    """SPEC-W2-UNKNOWN points 34 and 35: one question by record and field, with its state and
    the matching blocker, so the verdict is cannot_tell."""
    q = question(out, f"{record}.{field}")
    assert (q.get("record"), q.get("field"), q.get("state")) == (record, field, state)
    prefix = {"absent": "missing", "unreadable": "unreadable", "undecided": "undecided"}[state]
    assert f"{prefix}:{record}.{field}" in out["verdict"]["reasons"]
    assert out["verdict"]["state"] == "cannot_tell"


def one_window(out: dict[str, Any], window_id: str) -> dict[str, Any]:
    found = windows_named(out, window_id)
    assert len(found) == 1, [w["id"] for w in windows(out)]
    return found[0]


def assert_withheld(out: dict[str, Any], window_id: str, gap: str) -> None:
    """SPEC-W2-UNKNOWN point 33: emitted with no date and waits_on naming the gap."""
    w = one_window(out, window_id)
    assert w["closes"] is None
    assert gap in w.get("waits_on", []), w


# P4, G17: the address report (D74).

# Moved 2026-09-25. "Within 10 days of the change": 5 days reach Sep 30, 5 more 2026-10-05,
# three days after today (Oct 3, 4, 5).


def address(**fields: Any) -> dict[str, Any]:
    return rec(rid("address"), "address", **fields)


def test_the_address_report_closes_ten_days_after_the_move() -> None:
    window_id, moved = address_window()
    out = compute(
        f1_case([masters(state="in_progress", end="2027-05-15"), address(**{moved: "2026-09-25"})]),
        [pack()],
        TODAY,
    )
    assert date(2026, 9, 25) + timedelta(days=address_days()) == date(2026, 10, 5)
    w = one_window(out, window_id)
    assert (w["closes"], w["closes_days_away"]) == ("2026-10-05", 3)
    assert address_rule() in w["rule_ids"]
    assert "planning" not in w  # a rule, never a setting
    assert "waits_on" not in w


@pytest.mark.parametrize(
    ("entered", "state"), [("not_sure", "undecided"), ("2026-09-31", "unreadable")]
)
def test_an_unknown_move_day_withholds_the_address_report_and_is_asked(
    entered: str, state: str
) -> None:
    # SPEC-W2-UNKNOWN points 3, 4, 33, 34. September has 30 days, so 2026-09-31 is no day.
    window_id, moved = address_window()
    out = compute(
        f1_case([masters(state="in_progress", end="2027-05-15"), address(**{moved: entered})]),
        [pack()],
        TODAY,
    )
    assert_withheld(out, window_id, f"{rid('address')}.{moved}")
    assert_asked(out, rid("address"), moved, state)
    if state == "unreadable":
        assert question(out, f"{rid('address')}.{moved}")["about"] == {
            f"{rid('address')}.{moved}": entered
        }


def test_a_left_out_move_day_is_asked_never_read_as_none() -> None:
    # SPEC-W2-UNKNOWN point 2: the move day is declared ask (a move always has a day), so its
    # absence is a gap, asked, and the report waits on it.
    window_id, moved = address_window()
    assert field_decl("address", moved).get("when_absent", "ask") == "ask"
    out = compute(
        f1_case([masters(state="in_progress", end="2027-05-15"), address()]), [pack()], TODAY
    )
    assert_withheld(out, window_id, f"{rid('address')}.{moved}")
    assert_asked(out, rid("address"), moved, "absent")


# P5, G9: the trip windows.

# Left 2026-09-30 (two days ago), not back. Five months on: Oct, Nov, Dec, Jan, Feb reach
# Feb 30, which 2027 does not have (not a leap year, and Feb has 28 days): 2027-02-28.
# Signature 2026-03-31; six months on: Apr to Sep reach Sep 31, which does not exist: 2026-09-30.


def trip(**fields: Any) -> dict[str, Any]:
    return rec("t1", "trip", **fields)


def test_the_absence_limit_is_five_months_from_leaving() -> None:
    out = compute(
        f1_case(on_opt(job(), trip(left_on="2026-09-30", signature_on="2026-03-31"))),
        [pack()],
        TODAY,
    )
    assert months_after(date(2026, 9, 30), absence_months()) == date(2027, 2, 28)
    w = one_window(out, "trip.absence_limit")
    assert w["id"] == "trip.absence_limit.t1"
    assert w["closes"] == "2027-02-28"
    assert "travel.absence_months" in w["rule_ids"]
    assert "planning" not in w


def test_the_signature_covers_six_months_from_the_signature_on_opt() -> None:
    out = compute(
        f1_case(on_opt(job(), trip(left_on="2026-09-30", signature_on="2026-03-31"))),
        [pack()],
        TODAY,
    )
    assert months_after(date(2026, 3, 31), signature_months()) == date(2026, 9, 30)
    w = one_window(out, "trip.signature_covers")
    assert w["id"] == "trip.signature_covers.t1"
    assert w["closes"] == "2026-09-30"
    assert "travel.opt_signature_months" in w["rule_ids"]
    assert "planning" not in w


def test_a_trip_with_no_return_date_is_asked_not_assumed() -> None:
    # D92 (point 61): a trip with no return date is asked. The absence limit does not rest on
    # the return, so it is still shown (SPEC-W2-UNKNOWN point 6).
    out = compute(
        f1_case(on_opt(job(), trip(left_on="2026-09-30", signature_on="2026-03-31"))),
        [pack()],
        TODAY,
    )
    assert_asked(out, "t1", "returned_on", "absent")
    assert one_window(out, "trip.absence_limit")["closes"] == "2027-02-28"


def test_a_trip_on_opt_with_no_signature_day_withholds_the_signature_window() -> None:
    # signature_on declares no absence (ask), so left out it is a gap: asked, never read as no
    # signature.
    assert field_decl("trip", "signature_on").get("when_absent", "ask") == "ask"
    out = compute(f1_case(on_opt(job(), trip(left_on="2026-09-30"))), [pack()], TODAY)
    assert_withheld(out, "trip.signature_covers", "t1.signature_on")
    assert_asked(out, "t1", "signature_on", "absent")


def test_a_leaving_day_not_sure_gives_no_trip_date_and_is_asked() -> None:
    out = compute(
        f1_case(on_opt(job(), trip(left_on="not_sure", signature_on="2026-03-31"))), [pack()], TODAY
    )
    assert all(w["closes"] is None for w in windows_named(out, "trip.absence_limit"))
    assert_asked(out, "t1", "left_on", "undecided")


def test_no_signature_window_off_opt() -> None:
    # (f)(13)(ii) is about a student on post-completion training. A student in their program
    # with no permission to work (the list stated whole) has no such window: none with a date,
    # none waiting (a null with no waits_on means "does not apply", point 33).
    records = [masters(state="in_progress", end="2027-05-15"), trip(left_on="2026-09-30")]
    out = compute(f1_case(records), [pack()], TODAY)
    for w in windows_named(out, "trip.signature_covers"):
        assert w["closes"] is None
        assert "waits_on" not in w


# P6, N4, G10: watch[].

# Today 2026-10-02. Passport ends 2026-11-01: 29 days reach Oct 31, one more: 30, at the
# setting, so close. Visa ends 2026-11-02: 31, one past it, not close. Card 2026-02-14 to
# 2027-02-13 (the prototype's "Feb 13, 2027"): 29 to Oct 31, 59 to Nov 30, 90 to Dec 31, 121
# to Jan 31, 134 to Feb 13, not close.


def passport(**fields: Any) -> dict[str, Any]:
    return rec(rid("passport"), "passport", **fields)


def visa(**fields: Any) -> dict[str, Any]:
    return rec(rid("visa"), "visa", **fields)


def documents_case(passport_end: Any, visa_end: Any, on: date = TODAY) -> dict[str, Any]:
    card = opt_card("2026-02-14", "2027-02-13")
    card["fields"].update(dso_on="2025-11-01", filed_on="2025-11-10")
    return f1_case(
        [
            masters("2025-12-15"),
            card,
            passport(**{watched("passport")["field"]: passport_end}),
            visa(**{watched("visa")["field"]: visa_end}),
        ],
        on,
    )


def watch_of(out: dict[str, Any], record: str) -> dict[str, Any]:
    found = [w for w in out.get("watch", []) if w["record"] == record]
    assert len(found) == 1, out.get("watch")
    one: dict[str, Any] = found[0]
    return one


def test_watch_gives_each_date_with_days_away_and_close() -> None:
    out = compute(documents_case("2026-11-01", "2026-11-02"), [pack()], TODAY)
    assert date(2026, 11, 1) - TODAY == timedelta(days=30)
    got = {r: watch_of(out, r) for r in (rid("passport"), rid("visa"), "a1")}
    assert [(w["date"], w["days_away"], w["close"]) for w in got.values()] == [
        ("2026-11-01", 30, True),
        ("2026-11-02", 31, False),
        ("2027-02-13", 134, False),
    ]
    for kind, w in zip(("passport", "visa", "authorization"), got.values(), strict=True):
        assert set(w["rule_ids"]) == set(watched(kind)["rule_ids"])
        assert w["label"] == watched(kind)["label"]
        assert set(w["rule_ids"]) <= set(out["rules"])


def test_watch_is_soonest_first_and_a_passed_date_is_close() -> None:
    # The schema: soonest first; days_away negative once passed. Visa ended 2026-09-30: -2.
    out = compute(documents_case("2026-11-01", "2026-09-30"), [pack()], TODAY)
    assert (watch_of(out, rid("visa"))["days_away"], watch_of(out, rid("visa"))["close"]) == (
        -2,
        True,
    )
    dated = [w["date"] for w in out["watch"] if w["date"] is not None]
    assert dated == sorted(dated)


@pytest.mark.parametrize("kind", ["passport", "visa"])
@pytest.mark.parametrize(
    ("entered", "state"), [("not_sure", "undecided"), ("2027-02-29", "unreadable")]
)
def test_an_unknown_end_on_a_document_is_asked_and_never_watched_as_a_date(
    kind: str, entered: str, state: str
) -> None:
    # SPEC-W2-UNKNOWN points 3, 4, 34 and the watch contract: date null, days_away null, close
    # false. 2027 is not a leap year, so 2027-02-29 is no day.
    ends = {"passport": "2027-06-01", "visa": "2027-06-01"}
    ends[kind] = entered
    out = compute(documents_case(ends["passport"], ends["visa"]), [pack()], TODAY)
    w = watch_of(out, rid(kind))
    assert (w["date"], w["days_away"], w["close"]) == (None, None, False)
    assert_asked(out, rid(kind), watched(kind)["field"], state)


@pytest.mark.parametrize("kind", ["passport", "visa"])
def test_a_left_out_document_end_is_asked_never_read_as_none(kind: str) -> None:
    # SPEC-W2-UNKNOWN point 2: a passport and a visa always carry an end date, so its absence
    # is declared ask and asked.
    field = watched(kind)["field"]
    assert field_decl(kind, field).get("when_absent", "ask") == "ask"
    ends: dict[str, Any] = {"passport": "2027-06-01", "visa": "2027-06-01"}
    ends[kind] = None
    out = compute(documents_case(ends["passport"], ends["visa"]), [pack()], TODAY)
    assert watch_of(out, rid(kind))["date"] is None
    assert_asked(out, rid(kind), field, "absent")


@SLOW
@given(
    today=st.dates(date(2026, 3, 1), date(2028, 12, 31)),
    offset=st.integers(-90, 400),
)
def test_days_away_and_close_follow_the_injected_clock(today: date, offset: int) -> None:
    # N4 with the clock injected: days_away is the whole days from today; close is days_away at
    # most watch.close_days (the setting). Fails if the engine reads the system time, counts an
    # end day twice, or compares with a number of its own.
    end = today + timedelta(days=offset)
    out = compute(documents_case(end.isoformat(), "2029-06-01", today), [pack()], today)
    w = watch_of(out, rid("passport"))
    assert (w["date"], w["days_away"], w["close"]) == (end.isoformat(), offset, offset <= 30)


# P7, N3, G8: check-ins and the count as of the last confirmed day.

# Card 2026-06-01 to 2027-05-31; w1 from 2026-07-01 at 40 hours, no end. Days without work:
# Jun 1 to Jun 30, 30 days; from Jul 1 the job holds, as far as it was last confirmed.


def checkin_of(out: dict[str, Any], record: str) -> dict[str, Any]:
    found = [c for c in out.get("checkins", []) if c["record"] == record]
    assert len(found) == 1, out.get("checkins")
    one: dict[str, Any] = found[0]
    return one


def test_a_stale_job_is_due_and_its_count_stops_at_the_last_confirmed_day() -> None:
    # Confirmed 2026-08-31; 30 days on: Sep has 30, so 2026-09-30, two days ago: due, -2.
    # The count runs through Aug 31 (30 days), with as_of 2026-08-31.
    out = compute(f1_case(on_opt(job(confirmed_on="2026-08-31"))), [pack()], TODAY)
    assert date(2026, 8, 31) + timedelta(days=JOB_DAYS) == date(2026, 9, 30)
    c = checkin_of(out, "w1")
    assert (c["kind"], c["confirmed_on"], c["due"], c["due_days_away"]) == (
        "work",
        "2026-08-31",
        "2026-09-30",
        -2,
    )
    assert c["question"] in {q["id"] for q in out["questions"]}
    count = items(out)["unemployment.opt_card.a1"]
    assert (count["value"], count.get("as_of")) == (30, "2026-08-31")


def test_a_job_confirmed_lately_is_not_due_and_still_stops_at_that_day() -> None:
    # Confirmed 2026-09-20; 30 on: 10 reach Sep 30, 20 more 2026-10-20, 18 days away. Not due,
    # so its question is not open. The count still runs only through Sep 20.
    out = compute(f1_case(on_opt(job(confirmed_on="2026-09-20"))), [pack()], TODAY)
    c = checkin_of(out, "w1")
    assert (c["due"], c["due_days_away"]) == ("2026-10-20", 18)
    assert c["question"] not in {q["id"] for q in out["questions"]}
    count = items(out)["unemployment.opt_card.a1"]
    assert (count["value"], count.get("as_of")) == (30, "2026-09-20")


def test_a_job_confirmed_today_counts_through_today_with_no_as_of() -> None:
    # Confirmed 2026-10-02; 29 days reach Oct 31, one more 2026-11-01, 30 away.
    out = compute(f1_case(on_opt(job(confirmed_on="2026-10-02"))), [pack()], TODAY)
    c = checkin_of(out, "w1")
    assert (c["due"], c["due_days_away"]) == ("2026-11-01", 30)
    count = items(out)["unemployment.opt_card.a1"]
    assert count["value"] == 30
    assert "as_of" not in count


def test_a_petition_check_in_uses_its_own_setting() -> None:
    # checkin.petition_days (D66). Confirmed 2026-09-10; 30 on: 20 reach Sep 30, 10 more
    # 2026-10-10, 8 days away.
    petition = rec(
        "h1",
        "petition",
        type="h1b",
        cap_subject="yes",
        employer="e1",
        filed_on="2026-04-01",
        receipt_on="2026-04-10",
        requested_start="2027-10-01",
        change_of_status="yes",
        outcome="pending",
        confirmed_on="2026-09-10",
    )
    out = compute(f1_case(on_opt(job(confirmed_on="2026-10-02"), petition)), [pack()], TODAY)
    assert date(2026, 9, 10) + timedelta(days=PETITION_DAYS) == date(2026, 10, 10)
    c = checkin_of(out, "h1")
    assert (c["kind"], c["due"], c["due_days_away"]) == ("petition", "2026-10-10", 8)


def test_a_job_never_confirmed_has_no_due_day() -> None:
    # The checkins contract: confirmed_on null when never confirmed, and so due null.
    out = compute(f1_case(on_opt(job())), [pack()], TODAY)
    c = checkin_of(out, "w1")
    assert (c["confirmed_on"], c["due"], c["due_days_away"]) == (None, None, None)


def test_a_confirmed_day_not_sure_withholds_the_count_and_is_asked() -> None:
    # SPEC-W2-UNKNOWN point 6: the day the count runs through differs with every fill, so the
    # count is withheld (point 24: value and limit day null, waits_on naming the gap).
    out = compute(f1_case(on_opt(job(confirmed_on="not_sure"))), [pack()], TODAY)
    count = items(out)["unemployment.opt_card.a1"]
    assert count["value"] is None
    assert "w1.confirmed_on" in count.get("waits_on", [])
    assert items(out)["unemployment.opt_card.a1.limit_day"]["value"] is None
    assert_asked(out, "w1", "confirmed_on", "undecided")


@SLOW
@given(today=st.dates(date(2026, 10, 2), date(2026, 12, 31)), back=st.integers(0, 90))
def test_check_in_due_and_as_of_follow_the_injected_clock(today: date, back: int) -> None:
    # N3 with the clock injected. Confirmed `back` days ago (never before Jul 4, after the job's
    # start): due is that day plus checkin.job_days, due_days_away is 30 - back, the question
    # is open from the due day, and the count (30, June alone) is as of that day when it is
    # before today. Fails if due is counted from today, if the setting is a number of the
    # engine's own, or if the count runs past the last confirmed day.
    confirmed = today - timedelta(days=back)
    case = f1_case(on_opt(job(confirmed_on=confirmed.isoformat())), today)
    out = compute(case, [pack()], today)
    c = checkin_of(out, "w1")
    assert c["due"] == (confirmed + timedelta(days=30)).isoformat()
    assert c["due_days_away"] == 30 - back
    assert (c["question"] in {q["id"] for q in out["questions"]}) == (back >= 30)
    count = items(out)["unemployment.opt_card.a1"]
    assert count["value"] == 30
    assert count.get("as_of") == (confirmed.isoformat() if back > 0 else None)


# reviews/w2-p1.md finding 1: an impossible hours figure is unreadable and asked, never counted.

# With 40 hours the count is 30 (June); with a negative figure no one can work, so the count,
# its limit day and the at-or-over line are all withheld and the hours are asked.


@pytest.mark.parametrize("hours", [-5, -40, -0.5])
def test_a_negative_hours_figure_is_unreadable_and_never_counted(hours: float) -> None:
    out = compute(
        f1_case(on_opt(job(hours_per_week=hours, confirmed_on="2026-10-02"))), [pack()], TODAY
    )
    count = items(out)["unemployment.opt_card.a1"]
    assert count["value"] is None
    assert "w1.hours_per_week" in count.get("waits_on", [])
    assert items(out)["unemployment.opt_card.a1.limit_day"]["value"] is None
    assert not any("at_or_over_limit" in r for r in out["verdict"]["reasons"])
    assert_asked(out, "w1", "hours_per_week", "unreadable")
    assert question(out, "w1.hours_per_week")["about"] == {"w1.hours_per_week": hours}


def test_a_negative_hours_figure_in_a_change_is_unreadable() -> None:
    # A period's hours read as the job's own (contracts/case.schema.json $defs.period).
    changes = [{"start": "2026-08-01", "hours_per_week": -10}]
    out = compute(
        f1_case(on_opt(job(hours_changes=changes, confirmed_on="2026-10-02"))), [pack()], TODAY
    )
    assert items(out)["unemployment.opt_card.a1"]["value"] is None
    assert_asked(out, "w1", "hours_changes", "unreadable")


def test_forty_hours_is_counted() -> None:
    # The other side of the line above: a readable figure is counted, nothing asked about it.
    out = compute(f1_case(on_opt(job(confirmed_on="2026-10-02"))), [pack()], TODAY)
    assert items(out)["unemployment.opt_card.a1"]["value"] == 30
    assert "w1.hours_per_week" not in {q["id"] for q in out["questions"]}


@SLOW
@given(
    hours=st.one_of(
        st.integers(max_value=-1),
        st.floats(max_value=0, exclude_max=True, allow_nan=False, allow_infinity=False),
    )
)
def test_no_negative_hours_figure_is_ever_counted(hours: float) -> None:
    out = compute(
        f1_case(on_opt(job(hours_per_week=hours, confirmed_on="2026-10-02"))), [pack()], TODAY
    )
    assert items(out)["unemployment.opt_card.a1"]["value"] is None
    assert question(out, "w1.hours_per_week").get("state") == "unreadable"
