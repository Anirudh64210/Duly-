"""A reader of any pack's path over records (specs/path-1/SPEC.md, programs.md 10 to 13).

The engine holds no scenario of its own. Every kind, field, choice, stage, window and
rule it reads comes from the pack; every date is a fact moved by the pack's sourced rule
amounts. Nothing here names a category, a record kind, a field or a rule of any pack.
"""

import re
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta
from functools import partial
from typing import Any

from engine.clocks import Clock, day_in_zone
from engine.dates import add_months, add_years, is_business_day
from engine.readers import as_date, as_number, read
from engine.rulepack import Rulepack
from engine.settings import dating_setting, load_settings
from engine.unknown import (
    NONE,
    NOT_YET,
    Gap,
    Unknown,
    count_at_most3,
    count_below3,
    exists3,
)
from engine.verdict import VerdictInputs, decide

Json = dict[str, Any]

STATUS_ORDER = ("settled", "guidance", "school", "litigated", "proposed")
NOT_SURE = "not_sure"
THIS = "this"
OUTER = "outer"
TODAY = "today"
ID = "id"
ONE_DAY = timedelta(days=1)

NOT_IN_FORCE = "rule_not_in_force_on_event_day"
COPY_NOT_SAVED = "rule_copy_not_saved_for_event_day"
EARLIEST_SAVED_COPY = "earliest_saved_copy"
ENDS_BEFORE_TODAY = "record.ends_before_today"
FROM_DOCUMENTS = "typed_dates.from_documents"
CHECKED = "typed_dates.checked."
UNCONFIRMED = "unconfirmed:"
UNCONFIRMED_TYPED = "unconfirmed:typed_dates"
NO_DOCUMENTS = "no_documents"
NOT_COVERED = "category_not_covered:"

# The hours of a period (contracts/case.schema.json). A period's start and end are the
# first two date fields its kind declares, in the pack's order (programs.md sections 10, 13).
PERIOD_HOURS = "hours_per_week"
DATE_KIND = "date"


class _Absent:
    """A value the person has not entered. Never read as no, none or zero."""


ABSENT = _Absent()

# What a field left empty means (contracts/rulepack.schema.json, when_absent).
STATED_ABSENCE = {"not_yet": NOT_YET, "none": NONE}


class CaseStructureError(ValueError):
    """A case whose structure the pack does not declare: no question could fix it."""


def _month_day(text: Any, year: int) -> date | None:
    try:
        month, day = (int(part) for part in str(text).split("-"))
        return date(year, month, day)
    except ValueError:
        return None


def _unique(values: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(values))


def _judgement_id(check: Json, record: Json | None) -> str | None:
    """A judgement on one record's own answers, `<kind>.<name>` over records of that kind,
    is the item `<record>.<name>` (programs.md section 14, `<program>.enrollment`)."""
    if record is None:
        return None
    kind, _, name = str(check[ID]).partition(".")
    return f"{record[ID]}.{name}" if name and kind == record["kind"] else None


def _gaps(tr: "_Trace", record: str | None) -> list[Gap]:
    """What an undecided record's conditions rest on, as gaps on that record. Only the count
    of undecided records is read from them; the questions come from the trace itself."""
    gaps = [Gap(record, name, "absent") for name, _ in tr.missing]
    gaps += [Gap(record, name, "undecided") for name, _ in tr.unsure]
    gaps += [Gap(record, name, "lapse") for name in tr.lapsed]
    # Any other unknown with nothing on the record to ask holds the record undecided on its
    # conditions as a whole.
    return gaps or [Gap(record, "where", "undecided")]


def _and(results: Sequence[bool | None]) -> bool | None:
    """Kleene's and (SPEC-W2-UNKNOWN point 5): a known false settles it, else any unknown
    leaves it unknown. The gaps travel in the trace."""
    return False if False in results else None if None in results else True


def _pinned(selector: Json) -> bool:
    """A selection held to one record by its own id needs no statement that the list is whole
    (SPEC-W2-UNKNOWN point 14)."""
    return any(
        c.get("field") == f"{THIS}.{ID}" and c.get("same_as") == f"{OUTER}.{ID}"
        for c in selector.get("where", [])
    )


def _add_business_days(day: date, n: int) -> date:
    step = ONE_DAY if n >= 0 else -ONE_DAY
    left = abs(n)
    while left > 0:
        day += step
        if is_business_day(day):
            left -= 1
    return day


@dataclass
class _Trace:
    """What one evaluation read: missing and not-sure fields, rules, inputs, lapses."""

    missing: list[tuple[str, str | None]] = field(default_factory=list)
    unsure: list[tuple[str, str | None]] = field(default_factory=list)
    # A not-yet event compared with a day after today: the answer comes with time, never asked.
    pending: list[tuple[str, str | None]] = field(default_factory=list)
    # A list not stated whole, by its question id complete.<kind> (point 14).
    lists: list[str] = field(default_factory=list)
    rules: list[str] = field(default_factory=list)
    inputs: Json = field(default_factory=dict)
    lapsed: list[str] = field(default_factory=list)
    differ: list[str] = field(default_factory=list)
    # A conflict or a judgement an output waits on (SPEC-W2-UNKNOWN points 22 and 22a).
    named: list[str] = field(default_factory=list)
    optional_used: bool = False
    planning: bool = False

    def merge(self, other: "_Trace") -> None:
        self.missing += other.missing
        self.unsure += other.unsure
        self.pending += other.pending
        self.lists += other.lists
        self.named += other.named
        self.rules += other.rules
        self.inputs.update(other.inputs)
        self.lapsed += other.lapsed
        self.differ += other.differ
        self.optional_used = self.optional_used or other.optional_used
        self.planning = self.planning or other.planning


class _Run:
    def __init__(
        self, case: Json, pack: Rulepack, today: date, records: list[Json], settings: Json
    ) -> None:
        self.case = case
        self.pack = pack
        self.settings = settings
        self.path: Json = pack.path or {}
        self.today = today
        self.facts: Json = case.get("facts", {})
        self.confirmations: Json = case.get("confirmations", {}) or {}
        self.kinds: dict[str, Json] = {k[ID]: k for k in self.path.get("records", [])}
        self.fields: dict[str, dict[str, Json]] = {
            kind: {f[ID]: f for f in decl["fields"]} for kind, decl in self.kinds.items()
        }
        self.records: dict[str, Json] = {r[ID]: r for r in records}
        self.run_kinds: dict[str, str] = {r[ID]: r["kind"] for r in records}
        self.stage_decls: dict[str, Json] = {s[ID]: s for s in self.path.get("stages", [])}
        self.computed: list[Json] = []
        self.upcoming: list[Json] = []
        self.stages: list[Json] = []
        self.checklists: list[Json] = []
        self.questions: dict[str, Json] = {}
        self.missing: list[str] = []
        self.undecided: list[str] = []
        self.unreadable: list[str] = []
        self.engine_gaps: list[str] = []
        self.conflicts: list[str] = []
        self.judgements: list[str] = []
        self.open_items: list[str] = []
        self.answers_read: list[str] = []
        self.used_rules: list[str] = []
        self.rows_used: dict[str, Json] = {}
        self.used_kinds: list[str] = []
        self.span_ends: list[date | None] = []
        # The ends of stages a record may or may not be in: they can keep the record running,
        # never date the question (point 32).
        self.maybe_ends: list[date | None] = []
        self.virtual: set[int] = set()
        self.lists: list[Json] = []
        self.differ: list[str] = []

    # Reading the record.

    def _refuse_undeclared(self, records: list[Json]) -> None:
        """SPEC-W2-UNKNOWN point 39: only structure is refused, never a value. The message
        names the pack's own words, never what was sent."""
        declared_facts = {f[ID] for f in self.path.get("facts", [])}
        for name in self.facts:
            if name not in declared_facts:
                raise CaseStructureError("facts: a fact the pack does not declare")
        counts: dict[str, int] = {}
        for record in records:
            kind = record["kind"]
            if kind not in self.kinds:
                raise CaseStructureError("records: a kind the pack does not declare")
            decl = self.kinds[kind]
            if not re.fullmatch(f"{re.escape(decl.get('id_prefix', ''))}[0-9]+", record[ID]):
                raise CaseStructureError(f"records: an id that is not {decl.get('id_prefix')}N")
            counts[kind] = counts.get(kind, 0) + 1
            if counts[kind] > decl.get("max_records", counts[kind]):
                raise CaseStructureError(f"records: more {kind} records than the pack allows")
            for name in record["fields"]:
                if name not in self.fields[kind]:
                    raise CaseStructureError(f"records: a field not declared for {kind}")
        if len(self.records) != len(records):
            raise CaseStructureError("records: two records with one id")

    def ask_unreadable(self) -> None:
        """A value that does not read against its declared kind is asked, read or not, never
        taken in silence (SPEC-W2-UNKNOWN points 3 and 36)."""
        for record in self.records.values():
            for name, value in record["fields"].items():
                if self._unreadable(record, name, value):
                    self._need(_Trace(missing=[(f"{record[ID]}.{name}", record[ID])]))
                elif value == NOT_SURE:
                    # Point 35: the judgement points to the DSO for every not-sure answer,
                    # read or not; it is asked only where an unsettled read rests on it.
                    self._judge(f"{record[ID]}.{name}.{NOT_SURE}")
        for name, value in self.facts.items():
            if read(self._fact_decl(name), value, self.run_kinds)[0] == "unreadable":
                self._need(_Trace(missing=[(name, None)]))

    def _unreadable(self, record: Json, name: str, value: Any) -> bool:
        decl = self._decl(record, name)
        if value is ABSENT or not decl:
            return False
        return read(decl, value, self.run_kinds)[0] == "unreadable"

    def _decl(self, record: Json, name: str) -> Json:
        return self.fields.get(record["kind"], {}).get(name, {})

    def _fact_decl(self, name: str) -> Json:
        return next((f for f in self.path.get("facts", []) if f[ID] == name), {})

    def _decl_at(self, path: str, this: Json | None, outer: Json | None) -> Json:
        """The declaration of the field a path ends on, or {} for a fact or an id."""
        head, *rest = path.split(".")
        record = this if head == THIS else outer if head == OUTER else None
        for part in rest[:-1]:
            link = None if record is None else record["fields"].get(part)
            record = self.records.get(link) if isinstance(link, str) else None
        return {} if record is None or not rest else self._decl(record, rest[-1])

    def _field(self, record: Json, name: str) -> Any:
        value = record["fields"].get(name, ABSENT)
        return ABSENT if self._unreadable(record, name, value) else value

    def _note(self, tr: _Trace, state: str, name: str, rid: str | None) -> None:
        """A gap on a field, kept in the trace by its state (SPEC-W2-UNKNOWN point 5)."""
        (tr.unsure if state == "undecided" else tr.missing).append((name, rid))

    def _as_given(self, record: Json, name: str, on: date | _Absent, tr: _Trace) -> Any:
        """The value of a field as it stood on a day, through its history (SPEC-W2-UNKNOWN
        point 27). A change record that could apply, whose day, link or old value is not
        known, leaves the value unknown: ABSENT, with the change's own field in the trace.
        On a day not known (ABSENT), the value is known only when no change could apply."""
        value = record["fields"].get(name)
        history = self._decl(record, name).get("history")
        if history is None:
            return value
        kind = history["record"]
        self._use_kind(kind)
        changes: list[tuple[date, Json]] = []
        unknown = False
        for other in self.records.values():
            if other["kind"] != kind:
                continue
            for part in (history["link"], history["from"]):
                state, got = self._read_own(other, part)
                if state != "known":
                    self._note(tr, state, f"{other[ID]}.{part}", other[ID])
                    unknown = True
                    break
                if part == history["link"] and got != record[ID]:
                    break
                if part == history["from"] and isinstance(got, date):
                    if on is ABSENT:
                        # Point 26: on a day not known, any change of this record could apply.
                        return ABSENT
                    if isinstance(on, date) and got > on:
                        changes.append((got, other))
        if unknown:
            return ABSENT
        if not changes:
            # No change record could apply only when the person said the list is whole.
            if not self._stated(kind):
                tr.lists.append(f"complete.{kind}")
                return ABSENT
            return value
        _, change = min(changes, key=lambda found: found[0])
        state, _ = self._read_own(change, history["old"])
        if state != "known":
            self._note(tr, state, f"{change[ID]}.{history['old']}", change[ID])
            return ABSENT
        return change["fields"][history["old"]]

    def _read_own(self, record: Json, name: str) -> tuple[str, object]:
        return read(self._decl(record, name), record["fields"].get(name), self.run_kinds)

    def _resolve(
        self, path: str, this: Json | None, outer: Json | None, on: date | None = None
    ) -> tuple[Any, str | None, str | None]:
        """The value at a path, the name to ask it by, and the record it belongs to."""
        if path == TODAY:
            return self.today.isoformat(), None, None
        head, *rest = path.split(".")
        if head not in (THIS, OUTER) or not rest:
            return self.facts.get(path, ABSENT), path, None
        record = this if head == THIS else outer
        for index, part in enumerate(rest):
            if record is None:
                return ABSENT, None, None
            last = index == len(rest) - 1
            value = record[ID] if part == ID else self._field(record, part)
            asked = None if id(record) in self.virtual else f"{record[ID]}.{part}"
            owner = None if asked is None else record[ID]
            if last:
                return value, asked, owner
            if not isinstance(value, str) or value not in self.records:
                return ABSENT, asked, owner
            record = self.records[value]
        return ABSENT, None, None

    def _read(
        self,
        path: str,
        this: Json | None,
        outer: Json | None,
        tr: _Trace,
        on: date | _Absent | None = None,
    ) -> Any:
        """A value for a condition: as given when known, NONE or NOT_YET when the field's
        when_absent says what its absence means, or ABSENT with the gap in the trace
        (SPEC-W2-UNKNOWN points 1 to 4). Through a link that is NONE or NOT_YET, NONE. With
        a day, the last field is read as it stood on that day (point 26)."""
        head, *rest = path.split(".")
        value: Any
        if path == TODAY:
            return self.today.isoformat()
        if head not in (THIS, OUTER) or not rest:
            # A case fact, read against the pack's declaration like a record field (point 25).
            raw = self.facts.get(path)
            state, _ = read(self._fact_decl(path), raw, self.run_kinds)
            if state != "known":
                self._note(tr, state, path, None)
                return ABSENT
            tr.inputs[path] = raw
            return raw
        record = this if head == THIS else outer
        for index, part in enumerate(rest):
            if record is None:
                return ABSENT
            last = index == len(rest) - 1
            name = f"{record[ID]}.{part}"
            virtual = id(record) in self.virtual
            if part == ID:
                value = record[ID]
            else:
                raw = record["fields"].get(part)
                state, _ = read(self._decl(record, part), raw, self.run_kinds)
                value = raw if state == "known" else ABSENT
                if state == "absent":
                    value = self._absence(record, part, tr)
                elif state != "known" and not virtual:
                    gaps = tr.unsure if state == "undecided" else tr.missing
                    gaps.append((name, record[ID]))
                if value is ABSENT:
                    if state == "absent" and not virtual:
                        tr.missing.append((name, record[ID]))
                    elif virtual:
                        # Point 31: a field of a record not entered yet comes with it.
                        tr.named.append(f"future:{record['stage']}.{part}")
                    return ABSENT
            if value is NONE or value is NOT_YET:
                tr.inputs[name] = self._decl(record, part).get("when_absent")
                return value if last else NONE
            if last:
                if on is not None:
                    value = self._as_given(record, part, on, tr)
                    if value is ABSENT:
                        return ABSENT
                tr.inputs[path if virtual else name] = value
                return value
            if value not in self.records:
                return ABSENT
            record = self.records[value]
        return ABSENT

    def _absence(self, record: Json, name: str, tr: _Trace) -> Any:
        """NONE, NOT_YET or ABSENT for a field left empty, as its when_absent declares
        (SPEC-W2-UNKNOWN points 2 and 2a). A conditional declaration reads this record's own
        fields: an unknown condition before any true one leaves absence unknown, its gaps
        kept with the field's own."""
        declared = self._decl(record, name).get("when_absent", "ask")
        if isinstance(declared, dict):
            for state in ("not_yet", "none"):
                if state not in declared:
                    continue
                held = self._all(declared[state], record, None, tr)
                if held is None:
                    return ABSENT
                if held:
                    return STATED_ABSENCE[state]
            declared = declared.get("else", "ask")
        return STATED_ABSENCE.get(declared, ABSENT)

    # Rules.

    def _row(self, rule_id: str, on: date, tr: _Trace) -> Json | None:
        tr.rules.append(rule_id)
        row = self.pack.value(rule_id, on)
        if row is not None:
            self.rows_used.setdefault(rule_id, row)
            if self._alternate_differs(rule_id, on, row):
                tr.differ.append(rule_id)
            return row
        rows = [p for p in self.pack.parameters if p[ID] == rule_id]
        later = [p for p in rows if p["effective_from"] > on.isoformat()]
        first = min(later, key=lambda p: p["effective_from"]) if later else None
        if first is not None and first.get("effective_from_basis") == EARLIEST_SAVED_COPY:
            tr.lapsed.append(COPY_NOT_SAVED)
        else:
            tr.lapsed.append(NOT_IN_FORCE)
        return None

    def _alternate_differs(self, rule_id: str, on: date, row: Json) -> bool:
        """True when a row of another regime, in force on the same day, gives another value
        (product-1 points 25 and 49)."""
        for regime in self.pack.regimes:
            if regime[ID] == row.get("regime"):
                continue
            other = self.pack.value(rule_id, on, regime[ID])
            if other is not None and other is not row and other["value"] != row["value"]:
                return True
        return False

    def _amount(self, day: date, amount: Json, tr: _Trace) -> date | None:
        if "setting" in amount:
            # A product setting dates a planning window only (the loader refuses it elsewhere).
            # It is never a rule: nothing goes under rule_ids.
            # Its id and value go among the inputs, so the working shows where the date came
            # from (BOUNDARY A3).
            setting_id = amount["setting"]
            whole, unit = dating_setting(self.settings, setting_id)
            value: float | None = whole
            tr.inputs[setting_id] = whole
            tr.planning = True
        else:
            row = self._row(amount["rule"], day, tr)
            if row is None:
                return None
            value, unit = as_number(row["value"]), row["unit"]
        if value is None:
            return None
        n = int(value) * int(amount.get("sign", 1))
        if unit == "days":
            return day + timedelta(days=n)
        if unit == "business_days":
            return _add_business_days(day, n)
        if unit == "months":
            return add_months(day, n)
        if unit == "years":
            return add_years(day, n)
        return None

    def _rule_value(self, rule_id: str, on: date, tr: _Trace) -> Any:
        row = self._row(rule_id, on, tr)
        return None if row is None else row["value"]

    # Dates.

    def _when(self, w: Json, this: Json | None, outer: Json | None, tr: _Trace) -> date | None:
        """A day, or None: does not apply (NONE) or not known, its gaps in the trace. A day
        not yet come (NOT_YET) is named pending: the answer comes with time (point 5)."""
        day = self._when3(w, this, outer, tr)
        return day if isinstance(day, date) else None

    def _when3(self, w: Json, this: Json | None, outer: Json | None, tr: _Trace) -> Any:
        """A date, NONE, NOT_YET, or ABSENT when not known (SPEC-W2-UNKNOWN points 15 to 16,
        25 to 28): every gap it rests on is in the trace."""
        day: Any
        members = w.get("earliest_of") or w.get("latest_of")
        if members:
            day = self._extreme(members, bool(w.get("earliest_of")), this, outer, tr)
        elif "first" in w:
            day = self._first(w["first"], this, tr)
        elif "month_day_rule" in w:
            day = self._month_day_when(w, this, outer, tr)
            if day is None:
                return ABSENT
        elif "fact" in w:
            on: date | _Absent | None = None
            sub = _Trace()
            if "as_of" in w:
                # A day not yet come reads the value as it stands today (None). A day not
                # known reads it only when no change record could apply (point 26).
                as_of = self._when3(w["as_of"], this, outer, sub)
                on = as_of if isinstance(as_of, date) or as_of is ABSENT else None
                tr.inputs.update(sub.inputs)
            day = self._read(w["fact"], this, outer, tr, on)
            if day is ABSENT and on is ABSENT:
                tr.merge(sub)
            if day is NONE or day is NOT_YET:
                if day is NOT_YET:
                    self._not_yet(w["fact"], this, outer, tr)
                return day
            day = as_date(day) if day is not ABSENT else None
            if day is None:
                return ABSENT
        else:
            return ABSENT
        if not isinstance(day, date):
            return day
        for amount in w.get("add", []):
            moved = self._amount(day, amount, tr)
            if moved is None:
                return ABSENT
            day = moved
        if w.get("day_before"):
            day -= ONE_DAY
        if w.get("day_after"):
            day += ONE_DAY
        return day

    def _not_yet(self, path: str, this: Json | None, outer: Json | None, tr: _Trace) -> None:
        """A not-yet value an answer rests on: pending, as it comes with time (point 5), or
        future when it is a field of a record not entered yet (point 31)."""
        _, asked, owner = self._resolve(path, this, outer)
        if asked is None and this is not None and id(this) in self.virtual:
            tr.named.append(f"future:{this['stage']}.{path.split('.')[-1]}")
        else:
            tr.pending.append((asked or path, owner))

    def _extreme(
        self, members: list[Json], earliest: bool, this: Json | None, outer: Json | None, tr: _Trace
    ) -> Any:
        """earliest_of and latest_of (SPEC-W2-UNKNOWN point 16). An optional member is passed
        over only when it is NONE; one not known, or on a rule not in force, leaves the date
        not known with its gaps. A member that is not optional and is NONE makes it NONE."""
        found: list[Any] = []
        unknown = False
        for member in members:
            sub = _Trace()
            got = self._when3(member, this, outer, sub)
            if got is NONE and member.get("optional"):
                continue
            tr.merge(sub)
            if got is NONE:
                return NONE
            if got is ABSENT:
                unknown = True
                continue
            found.append(got)
            if member.get("optional") and isinstance(got, date):
                tr.optional_used = True
        if unknown or not found:
            return ABSENT if unknown else NONE
        return self._pick(found, earliest, tr)

    def _pick(self, found: list[Any], earliest: bool, tr: _Trace) -> Any:
        """The earliest or latest of dates and NOT_YET. NOT_YET is later than every day up to
        today; against a later day the order is not known yet (pending, point 7)."""
        days = [d for d in found if isinstance(d, date)]
        if len(days) == len(found):
            return min(days) if earliest else max(days)
        if earliest and days and min(days) <= self.today:
            return min(days)
        if not earliest and all(d <= self.today for d in days):
            return NOT_YET
        if earliest and not days:
            return NOT_YET
        return ABSENT

    def _first(self, first: Json, outer: Json | None, tr: _Trace) -> Any:
        """The earliest or latest date over a selection (SPEC-W2-UNKNOWN point 15)."""
        selector = first["of"]
        kind = selector["record"]
        self._use_kind(kind)
        earliest = first["pick"] == "earliest"
        chosen, undecided = self._choose(selector, outer)
        path = f"{THIS}.{first['field']}"
        found: list[Any] = []
        open_: list[tuple[Any, _Trace]] = []
        for record in chosen:
            sub = _Trace()
            got = self._when3({"fact": path}, record, outer, sub)
            if got is NONE:
                continue
            if got is ABSENT:
                open_.append((None, sub))
            else:
                tr.inputs.update(sub.inputs)
                tr.pending += sub.pending
                found.append(got)
        for record, sub in undecided:
            got = self._when3({"fact": path}, record, outer, _Trace())
            open_.append((got if isinstance(got, date) else None, sub))
        best = self._pick(found, earliest, tr) if found else NONE
        for got, sub in open_:
            # A record not known leaves best standing only when its date cannot beat it.
            if (
                isinstance(best, date)
                and got is not None
                and (got >= best if earliest else got <= best)
            ):
                continue
            tr.merge(sub)
            best = ABSENT
        if best is not ABSENT and not self._stated(kind, selector, outer) and not _pinned(selector):
            tr.lists.append(f"complete.{kind}")
            return ABSENT
        return best

    def _month_day_when(
        self, w: Json, this: Json | None, outer: Json | None, tr: _Trace
    ) -> date | None:
        anchor_path = w.get("in_fiscal_year_of") or w.get("in_year_of")
        if anchor_path is None:
            return None
        anchor = self._when({"fact": anchor_path}, this, outer, tr)
        if anchor is None:
            return None
        text = self._rule_value(w["month_day_rule"], anchor, tr)
        if "in_fiscal_year_of" not in w:
            return _month_day(text, anchor.year)
        fy_text = self._rule_value(w.get("fiscal_year_rule", ""), anchor, tr)
        fy_start = _month_day(fy_text, anchor.year)
        if fy_start is None:
            return None
        if anchor < fy_start:
            fy_start = _month_day(fy_text, anchor.year - 1) or fy_start
        placed = _month_day(text, fy_start.year)
        if placed is not None and placed < fy_start:
            placed = _month_day(text, fy_start.year + 1)
        return placed

    # Conditions: True, False or None for unknown.

    def _choose(
        self, selector: Json, outer: Json | None
    ) -> tuple[list[Json], list[tuple[Json, _Trace]]]:
        """The chosen records, and each undecided record with what it read."""
        chosen: list[Json] = []
        undecided: list[tuple[Json, _Trace]] = []
        records = list(self.records.values())
        if outer is not None and id(outer) in self.virtual:
            # Point 31: a next stage's record not entered yet is one of its kind's records.
            records.append(outer)
        for record in records:
            if record["kind"] != selector["record"]:
                continue
            sub = _Trace()
            held = self._all(selector.get("where", []), record, outer, sub)
            if held is None:
                undecided.append((record, sub))
            elif held:
                chosen.append(record)
        return chosen, undecided

    def _some(
        self,
        selector: Json,
        outer: Json | None,
        tr: _Trace,
        decide: Callable[[int, Sequence[Unknown], Unknown | None], bool | Unknown],
    ) -> bool | None:
        """A list operator (exists, none, a count) by SPEC-W2-UNKNOWN point 7: the decided
        records, the undecided ones and whether the list is stated whole. A settled answer
        asks nothing; an unknown one asks every gap it rests on (point 8)."""
        kind = selector["record"]
        chosen, undecided = self._choose(selector, outer)
        unstated = None
        if not self._stated(kind, selector, outer):
            unstated = Unknown(frozenset({Gap(None, f"complete.{kind}", "list")}))
        pending = [Unknown(frozenset(_gaps(sub, record[ID]))) for record, sub in undecided]
        got = decide(len(chosen), pending, unstated)
        if not isinstance(got, Unknown):
            return got
        for _, sub in undecided:
            tr.merge(sub)
        if unstated is not None:
            self._use_kind(kind)
            tr.lists.append(f"complete.{kind}")
        return None

    def _all(
        self, conditions: list[Json], this: Json | None, outer: Json | None, tr: _Trace
    ) -> bool | None:
        # A condition known to fail settles the whole: nothing the others read is asked.
        subs: list[_Trace] = []
        results: list[bool | None] = []
        for c in conditions:
            sub = _Trace()
            results.append(self._cond(c, this, outer, sub))
            if results[-1] is False:
                return False
            subs.append(sub)
        for sub in subs:
            tr.merge(sub)
        return _and(results)

    def _cond(self, c: Json, this: Json | None, outer: Json | None, tr: _Trace) -> bool | None:
        # SPEC-W2-UNKNOWN point 7: a known value is compared; NONE or NOT_YET (stated
        # absence) is false in every comparison but the dates NOT_YET orders; ABSENT is unknown.
        results: list[bool | None] = []
        sub = _Trace()
        value: Any = self._read(c["field"], this, outer, sub) if "field" in c else ABSENT
        # Point 2: present on a field not known is unknown, in a check's holds as everywhere.
        tr.merge(sub)
        known = value is not ABSENT
        stated = value is NONE or value is NOT_YET
        if "present" in c:
            results.append((not stated) == c["present"] if known else None)
        if "in" in c:
            results.append(not stated and value in c["in"] if known else None)
        for key in ("on_or_before", "on_or_after", "before", "after"):
            if key in c:
                results.append(self._compare_dates(key, value, c["field"], c[key], this, outer, tr))
        for key in ("level_above", "level_same", "level_below"):
            if key in c:
                results.append(self._level(key, value, c[key], c["field"], this, outer, tr))
        for key in ("same_as", "differs_from"):
            if key in c:
                other = self._read(c[key], this, outer, tr)
                if stated or other is NONE or other is NOT_YET:
                    results.append(False)  # a join on nothing is no join
                elif not known or other is ABSENT:
                    results.append(None)
                else:
                    results.append((value == other) == (key == "same_as"))
        if "month_day_is" in c:
            day = as_date(value)
            text = None if day is None else self._rule_value(c["month_day_is"], day, tr)
            placed = None if day is None else _month_day(text, day.year)
            results.append(False if stated else None if placed is None else placed == day)
        if "at_most" in c:
            number = as_number(value)
            limit = as_number(self._rule_value(c["at_most"]["rule"], self.today, tr))
            fits = None if number is None or limit is None else number <= limit
            results.append(False if stated else fits)
        for key in ("exists", "none"):
            if key in c:
                found = self._some(c[key], this, tr, exists3)
                results.append(None if found is None else found == (key == "exists"))
        for key in ("count_below", "count_at_most"):
            if key in c:
                limit = as_number(self._rule_value(c[key]["rule"], self.today, tr))
                if limit is None:
                    results.append(None)
                    continue
                count = count_below3 if key == "count_below" else count_at_most3
                results.append(self._some(c[key]["of"], this, tr, partial(count, int(limit))))
        if "any_of" in c:
            results.append(self._any(c["any_of"], this, outer, tr))
        if "all_of" in c:
            results.append(self._all(c["all_of"], this, outer, tr))
        if "not" in c:
            got = self._cond(c["not"], this, outer, tr)
            results.append(None if got is None else not got)
        if not results:
            # A field alone: a flag is its value; any other kind reads as present: true.
            flag = self._decl_at(c["field"], this, outer).get("kind") == "flag"
            results.append(None if not known else value is True if flag else not stated)
        return _and(results)

    def _any(
        self, conditions: list[Json], this: Json | None, outer: Json | None, tr: _Trace
    ) -> bool | None:
        # A condition known to hold settles the whole: nothing the others read is asked.
        subs: list[_Trace] = []
        results: list[bool | None] = []
        for c in conditions:
            sub = _Trace()
            results.append(self._cond(c, this, outer, sub))
            if results[-1] is True:
                return True
            subs.append(sub)
        for sub in subs:
            tr.merge(sub)
        return None if None in results else False

    def _compare_dates(
        self,
        key: str,
        value: Any,
        field_path: str,
        w: Json,
        this: Json | None,
        outer: Json | None,
        tr: _Trace,
    ) -> bool | None:
        if value is NONE:
            return False
        sub = _Trace()
        found = self._when3(w, this, outer, sub)
        if found is NONE:
            return False
        other = found if isinstance(found, date) else None
        day = as_date(value)
        if value is NOT_YET or found is NOT_YET:
            # Not yet is later than every day up to today (point 7); against a later day, or
            # against another not yet, the order comes with time: pending.
            known = other if value is NOT_YET else day
            if known is not None and known <= self.today:
                sub.pending = []
                tr.merge(sub)
                return (
                    key in ("after", "on_or_after")
                    if value is NOT_YET
                    else key in ("before", "on_or_before")
                )
            tr.merge(sub)
            if value is NOT_YET and (known is not None or found is NOT_YET):
                self._not_yet(field_path, this, outer, tr)
            return None
        tr.merge(sub)
        if day is None or other is None:
            return None
        if key == "on_or_before":
            return day <= other
        if key == "on_or_after":
            return day >= other
        if key == "before":
            return day < other
        return day > other

    def _level(
        self,
        key: str,
        value: Any,
        other_path: str,
        field_path: str,
        this: Json | None,
        outer: Json | None,
        tr: _Trace,
    ) -> bool | None:
        name = field_path.rsplit(".", 1)[-1]
        if value is NONE or value is NOT_YET:
            return False
        for order in self.path.get("order", []):
            if order["field"] != name:
                continue
            tr.rules += order["rule_ids"]
            ranks: list[str] = list(order["ascending"])
            # The other side is one of the listed choices itself, or a path to read.
            other = other_path if other_path in ranks else self._read(other_path, this, outer, tr)
            if other is NONE or other is NOT_YET:
                return False
            if value not in ranks or other not in ranks:
                # An order may leave a choice unranked (D93): the comparison is unknown, and
                # the unranked side is asked as undecided on its record (point 11).
                for side, path in ((value, field_path), (other, other_path)):
                    _, asked, owner = self._resolve(path, this, outer)
                    if side is not ABSENT and side not in ranks and asked and owner:
                        tr.unsure.append((asked, owner))
                return None
            here: int = ranks.index(value)
            there: int = ranks.index(other)
            if key == "level_above":
                return here > there
            if key == "level_below":
                return here < there
            return here == there
        return None

    # What the person is asked.

    def _use_kind(self, kind: str) -> None:
        if kind not in self.used_kinds:
            self.used_kinds.append(kind)

    def _ask(
        self,
        qid: str,
        because: str,
        about: Json | None,
        record: str | None,
        gap: tuple[str, str] | None = None,
    ) -> None:
        question: Json = {ID: qid, "because": [because]}
        if about is not None:
            question["about"] = about
        if record is not None:
            question["record"] = record
        if gap is not None:
            question["field"], question["state"] = gap
        self.questions.setdefault(qid, question)

    def _gap_of(self, name: str, record: str | None) -> tuple[str, str] | None:
        """The field and state of a gap on a record's field (SPEC-W2-UNKNOWN point 34)."""
        if record is None and name in self.facts:
            state = read(self._fact_decl(name), self.facts[name], self.run_kinds)[0]
            return name, "absent" if state == "known" else state
        if record is None or record not in self.records:
            return None
        part = name[len(record) + 1 :]
        raw = self.records[record]["fields"].get(part)
        if raw == NOT_SURE or self._unranked(self.records[record], part, raw):
            return part, "undecided"
        return part, "absent" if raw is None else "unreadable"

    def _unranked(self, record: Json, part: str, raw: Any) -> bool:
        """Whether a given choice is one the pack's order of its field leaves unranked."""
        if raw not in self._decl(record, part).get("choices", []):
            return False
        return any(
            o["record"] == record["kind"] and o["field"] == part and raw not in o["ascending"]
            for o in self.path.get("order", [])
        )

    def _need(self, tr: _Trace) -> None:
        for rule_id in tr.differ:
            if rule_id not in self.differ:
                self.differ.append(rule_id)
        for name, record in tr.missing:
            gap = self._gap_of(name, record)
            if gap is not None and gap[1] == "unreadable":
                # Point 35: asked as unreadable, the value as entered shown back (point 34).
                if name not in self.unreadable:
                    self.unreadable.append(name)
                fields = self.facts if record is None else self.records[record]["fields"]
                about = {name: fields.get(gap[0])}
                self._ask(name, f"unreadable:{name}", about, record, gap)
                continue
            if name not in self.missing:
                self.missing.append(name)
            self._ask(name, f"missing:{name}", None, record, gap)
        for name, record in tr.unsure:
            self._judge(f"{name}.{NOT_SURE}")
            if record is not None:
                # Point 35: a not-sure answer an unsettled read rests on is asked, and blocks.
                if name not in self.undecided:
                    self.undecided.append(name)
                self._ask(name, f"undecided:{name}", None, record, self._gap_of(name, record))
        for lapse in tr.lapsed:
            self._judge(lapse)

    def _judge(self, name: str) -> None:
        if name not in self.judgements:
            self.judgements.append(name)

    def _answer(self, qid: str, about: Json | None) -> bool | None:
        """The person's answer, read only when given by today for the same values."""
        given = self.confirmations.get(qid)
        if not isinstance(given, dict):
            return None
        on = as_date(given.get("on"))
        if on is None or on > self.today:
            return None
        if about is not None and given.get("about", about) != about:
            return None
        self.answers_read.append(qid)
        return bool(given["answer"])

    def _conflict(
        self, cid: str, about: Json, record: str | None, gap: tuple[str, str] | None = None
    ) -> None:
        if self._answer(cid, about) is True:
            self._judge(cid)
            return
        if cid not in self.conflicts:
            self.conflicts.append(cid)
        self._ask(cid, f"conflict:{cid}", about, record, gap)

    # Stages.

    def run_stages(self) -> None:
        unknown: list[Json] = []
        for stage in self.path.get("stages", []):
            for record in self._each(stage):
                tr = _Trace()
                values = [self._read(p, record, record, tr) for p in stage["entered_when"]]
                # Point 29: a stated not-yet is a known value; none, or a flag of false, is
                # not entered; a field not known leaves the entry unknown, its gaps asked.
                if any(v is NONE or v is False for v in values):
                    continue
                if ABSENT not in values:
                    self._enter(stage, record, None)
                    continue
                self._need(tr)
                rid = None if record is None else record[ID]
                sid = stage[ID] if rid is None else f"{stage[ID]}.{rid}"
                waits = self._waits(tr)
                if not waits:
                    self._engine_gap(sid)
                if stage.get("span"):
                    # Point 32: an end not known never reads as "ended before today"; a known
                    # end still counts toward it.
                    saved = self._snapshot()
                    self.maybe_ends.append(
                        self._when(stage["span"]["ends"], record, record, _Trace())
                    )
                    self._restore(saved)
                unknown.append(self._unknown_stage(stage, sid, rid, waits))
                # Point 33: a stage is never dropped on a guess, so its next stages still come,
                # each unknown while what it rests on is.
                for step in stage.get("next", []):
                    self._next(step, record)
        # A stage another names as next is shown once, as next.
        shown = {entry[ID] for entry in self.stages}
        self.stages += [entry for entry in unknown if entry[ID] not in shown]

    def _unknown_stage(self, stage: Json, sid: str, rid: str | None, waits: list[str]) -> Json:
        """A stage entry whose entry or span rests on a value not known (points 29 and 32a):
        state unknown, no dates, and waits_on naming what it rests on."""
        entry: Json = {
            ID: sid,
            "category": self.pack.category,
            "label": stage["label"],
            "state": "unknown",
            "starts": None,
            "ends": None,
            "ends_days_away": None,
            "days_in": None,
            "days_total": None,
            "rule_ids": _unique(stage["rule_ids"]),
            "items": [],
            "windows": [],
            "facts": {},
            "checklist": None,
            "waits_on": waits,
        }
        if rid is not None:
            entry["stage"] = stage[ID]
            entry["record"] = rid
        self._rules(entry["rule_ids"])
        return entry

    def _each(self, declared: Json) -> list[Json | None]:
        """The records a stage or check is for (SPEC-W2-UNKNOWN point 17). Each decided
        chosen record enters; each undecided one is left out, its gaps asked, and each
        question names the entry it holds back in withholds."""
        selector = declared.get("for_each")
        if not selector:
            return [None]
        self._use_kind(selector["record"])
        chosen, undecided = self._choose(selector, None)
        for record, sub in undecided:
            entry = f"{declared[ID]}.{record[ID]}"
            self._need(sub)
            waits = self._waits(sub)
            if not waits:
                self._engine_gap(entry)
            self._withhold(entry, waits)
            if declared.get("span"):
                # Point 32: a stage that may hold a record not decided counts its end toward
                # "ended before today" only when that end is known.
                saved = self._snapshot()
                self.maybe_ends.append(
                    self._when(declared["span"]["ends"], record, record, _Trace())
                )
                self._restore(saved)
        return list(chosen)

    def _withhold(self, output: str, waits: Iterable[str]) -> None:
        """Each question an output waits on lists it in withholds (point 34)."""
        for qid in waits:
            question = self.questions.get(qid)
            if question is not None and output not in question.setdefault("withholds", []):
                question["withholds"].append(output)

    def withhold_outputs(self) -> None:
        """Every output shown waiting, named by the questions it waits on (point 34)."""
        for entry in self.stages:
            self._withhold(entry[ID], entry.get("waits_on", []))
            for window in entry["windows"]:
                self._withhold(window[ID], window.get("waits_on", []))
        for item in self.computed:
            self._withhold(item[ID], item.get("waits_on", []))

    def _waits(self, tr: _Trace) -> list[str]:
        """What an output not known waits on (SPEC-W2-UNKNOWN point 34): question ids, named
        lapses, and pending entries, which come with time and are never asked."""
        return _unique(
            [
                *(name for name, _ in tr.missing),
                *(name for name, _ in tr.unsure),
                *tr.lists,
                *tr.lapsed,
                *tr.named,
                *(f"pending:{name}" for name, _ in tr.pending),
            ]
        )

    def _engine_gap(self, output: str) -> None:
        """An unknown that names no gap is a fault of the engine, never a quiet null (point 5)."""
        if output not in self.engine_gaps:
            self.engine_gaps.append(output)

    def _enter(self, stage: Json, record: Json | None, next_of: Json | None) -> None:
        rid = None if record is None else record[ID]
        sid = stage[ID] if rid is None else f"{stage[ID]}.{rid}"
        tr = _Trace()
        span = stage.get("span") or {}
        starts = self._when(span["starts"], record, record, tr) if span else None
        ends = self._when(span["ends"], record, record, tr) if span else None
        rule_ids = list(stage["rule_ids"])
        clash = None
        if next_of is None and span:
            ends = self._ends_also(stage, span, ends, record, rule_ids, tr)
            clash = self._span_conflicts(sid, span, starts, ends, rid, tr)
            if clash is not None:
                # Point 32a: a span that does not fit is not shown; the stage waits on it.
                starts = ends = None
                tr.named.append(clash)
            else:
                # A span in conflict is asked as such; it neither holds back nor raises the
                # question whether the record ends before today.
                self.span_ends.append(ends)
        items: list[str] = []
        windows: list[Json] = []
        for window in stage.get("windows", []):
            windows.append(self._window(window, record, rid, items, rule_ids, next_of is not None))
        # Point 31: a next stage asks the gaps of real records like any stage; a field of the
        # record not entered yet is named future, never asked.
        self._need(tr)
        self._rules(rule_ids)
        state = "next" if next_of is not None else self._state(span, starts, ends, windows)
        if clash is not None:
            state = "unknown"
        entry: Json = {
            ID: sid,
            "category": self.pack.category,
            "label": stage["label"],
            "state": state,
            "starts": None if starts is None else starts.isoformat(),
            "ends": None if ends is None else ends.isoformat(),
            "ends_days_away": None if ends is None else (ends - self.today).days,
            "days_in": None if starts is None else (self.today - starts).days + 1,
            "days_total": None if starts is None or ends is None else (ends - starts).days + 1,
            "rule_ids": _unique(rule_ids),
            "items": items,
            "windows": windows,
            "facts": {} if record is None or next_of is not None else self._facts_of(record),
            "checklist": None,
        }
        if rid is not None:
            entry["stage"] = stage[ID]
            entry["record"] = rid
        # A null day of the span names what it waits on. The span of a next stage is the span
        # of a record not entered yet: it waits on a real record's gap, never on its own
        # future fields (points 31 and 33).
        held = span and (starts is None or ends is None)
        waiting = self._waits(tr) if held else []
        if next_of is not None:
            waiting = [name for name in waiting if not name.startswith("future:")]
        if not span and state == "unknown":
            # Point 33: a stage placed by its windows waits on what they wait on.
            waiting = _unique([n for w in windows for n in w.get("waits_on", [])])
        if waiting:
            entry["waits_on"] = waiting
        if span and (starts is None or ends is None):
            stepped = self._step_backs(span, starts, ends, record)
            if stepped:
                entry["reasons"] = stepped
        self._checklist(stage, entry, rid)
        self.stages.append(entry)
        for list_id in stage.get("lists", []):
            self._list(list_id, rid)
        if next_of is None:
            for step in stage.get("next", []):
                self._next(step, record)

    def _step_backs(
        self, span: Json, starts: date | None, ends: date | None, record: Json | None
    ) -> list[str]:
        """Resolutions point 22b: a raised judgement that steps back while no record of a kind
        exists (a check with no for_each holding only `none` over that kind) rests on a stage
        only when records of that kind made its start or end null: computed without them, a
        null day of the span is known."""
        found: list[str] = []
        for check in self.path.get("checks", []):
            holds = check.get("holds", [])
            if (
                check.get("kind") != "judgement"
                or "for_each" in check
                or len(holds) != 1
                or set(holds[0]) != {"none"}
                or check[ID] not in self.judgements
            ):
                continue
            kind = holds[0]["none"]["record"]
            if not any(r["kind"] == kind for r in self.records.values()):
                continue
            saved, records = self._snapshot(), self.records
            self.records = {k: r for k, r in records.items() if r["kind"] != kind}
            try:
                without_starts = self._when(span["starts"], record, record, _Trace())
                without_ends = self._when(span["ends"], record, record, _Trace())
            finally:
                self.records = records
                self._restore(saved)
            if (starts is None and without_starts is not None) or (
                ends is None and without_ends is not None
            ):
                found.append(check[ID])
        return found

    def _state(
        self, span: Json, starts: date | None, ends: date | None, windows: list[Json]
    ) -> str:
        """A stage is current only when today falls between two known days (resolutions point
        22): a null day never falls back to current. A stage with no span of its own is placed
        by its windows. A window null with nothing to wait on does not apply (point 33) and
        places nothing."""
        if not span:
            windows = [w for w in windows if w["opens"] or w["closes"] or w.get("waits_on")]
            opens = [d for w in windows if (d := as_date(w["opens"])) is not None]
            closes = [d for w in windows if (d := as_date(w["closes"])) is not None]
            starts = min(opens) if windows and len(opens) == len(windows) else None
            ends = max(closes) if windows and len(closes) == len(windows) else None
        if starts is not None and starts > self.today:
            return "later"
        if ends is not None and ends < self.today:
            return "done"
        if starts is None or ends is None:
            return "unknown"
        return "current"

    def _ends_also(
        self,
        stage: Json,
        span: Json,
        ends: date | None,
        record: Json | None,
        rule_ids: list[str],
        tr: _Trace,
    ) -> date | None:
        """programs.md section 11: another source's reading of the end. A reading speaks only
        through a fact of its own (an optional member found); when it gives another day, the
        end is null and the judgement item is raised."""
        for other in span.get("ends_also", []):
            sub = _Trace()
            day = self._when3(other["when"], record, record, sub)
            rule_ids += other["rule_ids"]
            if day is ABSENT:
                # Point 28: a reading not known leaves the end not known, its gaps kept.
                tr.merge(sub)
                return None
            if not isinstance(day, date) or not sub.optional_used:
                continue
            tr.merge(sub)
            if ends is not None and day != ends:
                rid = "" if record is None else f".{record[ID]}"
                self._judge(f"{stage[ID]}.end_by_source{rid}")
                tr.named.append(f"{stage[ID]}.end_by_source{rid}")
                return None
        return ends

    def _list(self, list_id: str, rid: str | None) -> None:
        found = [d for d in self.path.get("lists", []) if d[ID] == list_id]
        if not found:
            return
        entry: Json = {ID: list_id, "rule_ids": list(found[0]["rule_ids"])}
        if rid is not None:
            entry["record"] = rid
        if entry not in self.lists:
            self._rules(entry["rule_ids"])
            self.lists.append(entry)

    def _facts_of(self, record: Json) -> Json:
        return {f"{record[ID]}.{name}": value for name, value in record["fields"].items()}

    def _span_conflicts(
        self,
        sid: str,
        span: Json,
        starts: date | None,
        ends: date | None,
        rid: str | None,
        tr: _Trace,
    ) -> str | None:
        """The conflict a stage's own span raises, if any (point 32a)."""
        if starts is None or ends is None:
            return None
        about = {"starts": starts.isoformat(), "ends": ends.isoformat()}
        if ends < starts:
            self._conflict(f"{sid}.ends_before_starts", about, rid)
            return f"{sid}.ends_before_starts"
        longest = span.get("longest")
        if longest is not None:
            limit = self._amount(starts, longest, tr)
            self._rules([longest["rule"]])
            if limit is not None and ends > limit:
                self._conflict(f"{sid}.longer_than_longest", about, rid)
                return f"{sid}.longer_than_longest"
        return None

    def _window(
        self,
        window: Json,
        record: Json | None,
        rid: str | None,
        items: list[str],
        stage_rules: list[str],
        is_next: bool,
    ) -> Json:
        # Point 30: any field known (a flag only when true) is done; a not-sure answer, a flag
        # of false or a stated absence never is. Not done and not known: the window keeps its
        # dates and waits on what done rests on.
        done_tr = _Trace()
        done_values = [self._read(p, record, record, done_tr) for p in window.get("done_when", [])]
        done = any(v not in (ABSENT, NONE, NOT_YET, False) for v in done_values)
        suffix = "" if rid is None else f".{rid}"
        dates: dict[str, date | None] = {}
        waits: dict[str, list[str]] = {}
        all_rules: list[str] = list(window["rule_ids"])
        inputs: Json = {}
        traces: dict[str, _Trace] = {}
        for end in ("opens", "closes"):
            tr = traces[end] = _Trace()
            day = self._when3(window[end], record, record, tr)
            dates[end] = day if isinstance(day, date) else None
            waits[end] = [] if isinstance(day, date) or day is NONE else self._waits(tr)
            self._need(tr)
            if dates[end] is None and day is not NONE and not waits[end]:
                self._engine_gap(f"{window[ID]}.{end}{suffix}")
        # Whether a window closed before today is done changes nothing shown (point 8).
        over = dates["closes"] is not None and dates["closes"] < self.today
        if not done and ABSENT in done_values and not is_next and not over:
            self._need(done_tr)
        else:
            done_tr = _Trace()
        # A window either of whose days a product setting moves is a planning window, and so
        # are both its items (SPEC-W2 point 46, N1).
        planning = any(tr.planning for tr in traces.values())
        undone = self._waits(done_tr)
        for end, tr in traces.items():
            rules = _unique([*window["rule_ids"], *tr.rules])
            all_rules += rules
            inputs.update(tr.inputs)
            item_id = f"{window[ID]}.{end}{suffix}"
            items.append(item_id)
            self._item(
                item_id, dates[end], "date", tr.inputs, rules, rid, not done, planning, waits[end]
            )
            if undone and self.upcoming and self.upcoming[-1][ID] == item_id:
                # Point 30: a day ahead only while not done, so it waits on what done rests on.
                self.upcoming[-1]["waits_on"] = undone
        stage_rules += all_rules
        opens, closes = dates["opens"], dates["closes"]
        is_open = opens is not None and closes is not None and opens <= self.today <= closes
        if is_open and not done and not is_next:
            self.open_items.append(f"{window[ID]}{suffix}")
        rules = _unique(all_rules)
        entry: Json = {
            ID: f"{window[ID]}{suffix}",
            "label": window["label"],
            "opens": None if opens is None else opens.isoformat(),
            "closes": None if closes is None else closes.isoformat(),
            "opens_days_away": None if opens is None else (opens - self.today).days,
            "closes_days_away": None if closes is None else (closes - self.today).days,
            "rule_ids": rules,
            "status": self._status(rules),
            "reading": self._reading(rules),
            "inputs": inputs,
        }
        if rid is not None:
            entry["record"] = rid
        if planning:
            entry["planning"] = True
        waiting = _unique([*waits["opens"], *waits["closes"], *undone])
        if waiting:
            entry["waits_on"] = waiting
        return entry

    def _item(
        self,
        item_id: str,
        value: date | float | None,
        unit: str,
        inputs: Json,
        rules: list[str],
        rid: str | None,
        ahead: bool = False,
        planning: bool = False,
        waits: list[str] | None = None,
    ) -> None:
        self._rules(rules)
        shown = value.isoformat() if isinstance(value, date) else value
        item: Json = {
            ID: item_id,
            "value": shown,
            "unit": unit,
            "inputs": dict(inputs),
            "rule_ids": rules,
            "status": self._status(rules),
            "reading": self._reading(rules),
        }
        if rid is not None:
            item["record"] = rid
        if planning:
            item["planning"] = True
        if value is None and waits:
            item["waits_on"] = waits
        self.computed.append(item)
        if ahead and isinstance(value, date) and value >= self.today:
            coming: Json = {
                ID: item_id,
                "date": value.isoformat(),
                "rule_ids": rules,
                "status": item["status"],
                "reading": item["reading"],
                "days_away": (value - self.today).days,
                "inputs": {**inputs, TODAY: self.today.isoformat()},
            }
            if rid is not None:
                coming["record"] = rid
            if planning:
                coming["planning"] = True
            self.upcoming.append(coming)

    def _next(self, step: Any, record: Json | None) -> None:
        entry: Json = step if isinstance(step, dict) else {"stage": step}
        stage = self.stage_decls.get(entry["stage"])
        if stage is None:
            return
        tr = _Trace()
        shown = self._all(entry.get("only_if", []), record, record, tr)
        self._need(tr)
        if shown is False:
            return
        # Point 31: an only_if, a bound value or a match not known leaves the stage unknown.
        doubt = tr if shown is None else _Trace()
        bound: Json = {}
        unbound = False
        for name, source in entry.get("bind", {}).items():
            # A path is read; a choice written in the pack is taken as itself.
            head = str(source).split(".")[0]
            if head in (THIS, OUTER, TODAY) or source in self.facts:
                value = self._read(source, record, record, doubt)
            else:
                value = source
            unbound = unbound or value is ABSENT
            if value is not ABSENT and value is not NONE and value is not NOT_YET:
                bound[name] = value
        selector = stage.get("for_each")
        if selector is not None:
            kind = selector["record"]
            for other in self.records.values():
                if other["kind"] != kind:
                    continue
                # A bound value not known makes the match not known, never fewer keys.
                if self._matches(other, bound, doubt) is True and not unbound:
                    return
            host = record[ID] if record is not None else stage[ID]
            virtual: Json | None = {ID: host, "kind": kind, "stage": stage[ID], "fields": bound}
            self.virtual.add(id(virtual))
        else:
            virtual = None
        self._need(doubt)
        saved = self._snapshot()
        self._enter(stage, virtual, entry)
        shown_entry = self.stages[-1]
        closed, waiting = self._closed(stage, shown_entry)
        if closed:
            self._restore(saved)
            return
        doubted = self._waits(doubt)
        if doubted:
            # Point 33: whether the stage comes at all is not known. Its days are worked from
            # known values, so a window and a day ahead keep them and wait on the condition;
            # an item is withheld.
            for item in self.computed[len(saved["computed"]) :]:
                item["value"] = None
                item["waits_on"] = _unique([*item.get("waits_on", []), *doubted])
            for held in [*shown_entry["windows"], *self.upcoming[len(saved["upcoming"]) :]]:
                held["waits_on"] = _unique([*held.get("waits_on", []), *doubted])
        if waiting:
            # Point 34: whether the stage is still open rests on a close not known, so an output
            # of it that is withheld waits on that gap as well as on its own.
            for item in self.computed[len(saved["computed"]) :]:
                if item["value"] is None:
                    item["waits_on"] = _unique([*item.get("waits_on", []), *waiting])
            for held in shown_entry["windows"]:
                if held["opens"] is None or held["closes"] is None:
                    held["waits_on"] = _unique([*held.get("waits_on", []), *waiting])
        waiting = _unique([*doubted, *waiting])
        if waiting:
            shown_entry["state"] = "unknown"
            shown_entry["waits_on"] = _unique([*shown_entry.get("waits_on", []), *waiting])

    def _matches(self, other: Json, bound: Json, tr: _Trace) -> bool | None:
        """Whether a record holds every bound value: a field of it not known leaves the match
        not known, its gap in the trace (point 31)."""
        result: bool | None = True
        for name, value in bound.items():
            state, got = self._read_own(other, name)
            if state == "known" and got != value:
                return False
            if state == "absent":
                return False
            if state != "known":
                self._note(tr, state, f"{other[ID]}.{name}", other[ID])
                result = None
        return result

    _KEPT = (
        "computed",
        "upcoming",
        "stages",
        "checklists",
        "missing",
        "undecided",
        "unreadable",
        "engine_gaps",
        "conflicts",
        "judgements",
        "open_items",
        "answers_read",
        "used_rules",
        "used_kinds",
        "lists",
        "differ",
    )

    def _snapshot(self) -> Json:
        saved: Json = {name: list(getattr(self, name)) for name in self._KEPT}
        saved["questions"] = dict(self.questions)
        saved["rows_used"] = dict(self.rows_used)
        return saved

    def _restore(self, saved: Json) -> None:
        for name, value in saved.items():
            setattr(self, name, value)

    def _closed(self, stage: Json, entry: Json) -> tuple[bool, list[str]]:
        """A next stage is shown only while a window in which something can be filed has not
        closed (resolutions 6 and 15). Such a window names the facts that record the step as
        taken (done_when); a window without them, such as a date to complete by, is no filing
        and does not keep the stage. The stage is closed only when every filing close is
        known and past; a close not known keeps it, with what it waits on (point 31)."""
        filing = [w.get("done_when") for w in stage.get("windows", [])]
        windows = [w for w, d in zip(entry["windows"], filing, strict=True) if d]
        known = [c for w in windows if (c := as_date(w["closes"])) is not None]
        waiting = [
            name
            for w in windows
            if w["closes"] is None
            for name in w.get("waits_on", [])
            if not name.startswith("future:")
        ]
        closed = not waiting and bool(known) and all(c < self.today for c in known)
        return closed, _unique(waiting)

    def _checklist(self, stage: Json, entry: Json, rid: str | None) -> None:
        name = stage.get("checklist")
        found = [c for c in self.path.get("checklists", []) if c[ID] == name]
        if not found:
            return
        checklist = found[0]
        cid = checklist[ID] if rid is None else f"{checklist[ID]}.{rid}"
        steps = []
        for step in checklist["steps"]:
            qid = f"step.{checklist[ID]}.{step[ID]}"
            given = self.confirmations.get(qid)
            yes = isinstance(given, dict) and given.get("answer") is True
            on = as_date(given.get("on")) if isinstance(given, dict) else None
            confirmed = on if on is not None and on <= self.today and yes else None
            if confirmed is not None:
                self.answers_read.append(qid)
            self._rules(step["rule_ids"])
            steps.append(
                {
                    ID: step[ID],
                    "label": step["label"],
                    "rule_ids": step["rule_ids"],
                    "who": step["who"],
                    "school": bool(step.get("school", False)),
                    "confirmed_on": None if confirmed is None else confirmed.isoformat(),
                }
            )
        out: Json = {
            ID: cid,
            "stage": entry[ID],
            "label": checklist["label"],
            "reading": checklist["reading"],
            "confirmed": sum(1 for s in steps if s["confirmed_on"] is not None),
            "total": len(steps),
            "steps": steps,
        }
        if rid is not None:
            out["record"] = rid
        entry["checklist"] = cid
        self.checklists.append(out)

    # Facts that do not fit.

    def run_checks(self) -> None:
        for record in self.records.values():
            for name, value in record["fields"].items():
                if not self._decl(record, name).get("happened"):
                    continue
                state, day = self._read_own(record, name)
                qid = f"{record[ID]}.{name}"
                if isinstance(day, date) and day > self.today:
                    self._conflict(f"{qid}.after_today", {qid: value}, record[ID])
                elif state == "undecided":
                    # Point 32: a day not known could be after today, so it is asked.
                    self._need(_Trace(unsure=[(qid, record[ID])]))
        for check in self.path.get("checks", []):
            for target in self._each(check):
                self._check(check, target)

    def _check(self, check: Json, record: Json | None) -> None:
        rid = None if record is None else record[ID]
        cid = check[ID] if rid is None else f"{check[ID]}.{rid}"
        tr = _Trace()
        applies = self._all(check.get("only_if", []), record, record, tr)
        if applies is False:
            return
        holds = None
        if applies:
            holds = self._all(check["holds"], record, record, tr)
        self._rules(check["rule_ids"])
        if holds is False:
            if check.get("kind") == "judgement":
                self._judge(_judgement_id(check, record) or cid)
            else:
                self._conflict(cid, dict(tr.inputs), rid)
        elif holds is None:
            self._need(tr)
            self._withhold(cid, self._waits(tr))

    # Counters.

    def run_counters(self) -> None:
        over: dict[str, dict[str, bool]] = {}
        for counter in self.path.get("counters", []):
            over.setdefault(counter[ID], {}).update(self._counter(counter))
        self._bars_disagree(over)

    def _bars_disagree(self, over: dict[str, dict[str, bool]]) -> None:
        """Two counters over the same scope, one at or over its bar and one under it, step
        back (programs.md section 14, J06)."""
        counters = self.path.get("counters", [])
        for index, first in enumerate(counters):
            for second in counters[index + 1 :]:
                if first[ID] == second[ID] or first["scope"] != second["scope"]:
                    continue
                for key, first_over in over.get(first[ID], {}).items():
                    second_over = over.get(second[ID], {}).get(key)
                    if second_over is not None and second_over != first_over:
                        self._judge(f"{first[ID]}.bars_disagree.{key}")

    def _stated(self, kind: str, selector: Json | None = None, outer: Json | None = None) -> bool:
        """The person said the list of this kind is whole, on a day on or before today that
        still covers it (SPEC-W2-UNKNOWN point 14). `<kind>:<id>` states whole only the
        records linked to <id>, so it covers only a selection held by a same_as from one of
        the kind's links to that record."""
        stated: Json = self.case.get("complete", {}) or {}
        grows = bool(self.kinds.get(kind, {}).get("grows_with_time", False))
        for key, statement in stated.items():
            if key != kind and not self._linked_to(kind, key, selector, outer):
                continue
            on = as_date(statement.get("on")) if isinstance(statement, dict) else None
            if on is not None and on <= self.today and not (grows and on < self.today):
                return True
        return False

    def _linked_to(self, kind: str, key: str, selector: Json | None, outer: Json | None) -> bool:
        head, _, rid = key.partition(":")
        if head != kind or not rid or selector is None:
            return False
        for c in selector.get("where", []):
            name = str(c.get("field", "")).removeprefix(f"{THIS}.")
            link = self.fields.get(kind, {}).get(name, {}).get("kind") == "link"
            if link and "same_as" in c and self._resolve(c["same_as"], None, outer)[0] == rid:
                return True
        return False

    def _counter(self, counter: Json) -> dict[str, bool]:
        """The counter's items (SPEC-W2-UNKNOWN points 18 to 24). Gives, for each group whose
        count and limit are known, whether it is at or over the limit."""
        result: dict[str, bool] = {}
        scope = counter["scope"]
        kind = scope["of"]["record"]
        self._use_kind(kind)
        chosen, undecided = self._choose(scope["of"], None)
        # Point 20: whole means every kind the counter reads, the scope's own as well.
        lists = _Trace()
        read = [counter[k]["record"] for k in ("qualifying", "not_qualifying") if k in counter]
        for name in _unique([kind, *read]):
            if not self._stated(name):
                self._use_kind(name)
                lists.lists.append(f"complete.{name}")
        # What holds a group back, by its key; under None, what holds back every group.
        held: dict[str | None, _Trace] = {}
        groups: dict[str, list[Json]] = {}
        for record in chosen:
            ktr = _Trace()
            key = self._group_key(scope, record, ktr)
            if key is None:
                # Point 19: a record whose key is not known could join any group; its key's
                # gap is asked even when no group is left to withhold.
                self._need(ktr)
                held.setdefault(None, _Trace()).merge(ktr)
                if scope["group"] == "same_value":
                    # Each group it could join is shown withheld, never left out (point 24).
                    decl = self._decl_at(scope.get("value_of", ""), record, None)
                    for choice in decl.get("choices", []):
                        groups.setdefault(str(choice), [])
            else:
                groups.setdefault(key, []).append(record)
        for record, sub in undecided:
            # Point 18: an undecided record withholds only the groups it could join, none of
            # another record's when the counter groups by record.
            self._need(sub)
            if scope["group"] != "record":
                key = self._group_key(scope, record, sub)
                held.setdefault(key, _Trace()).merge(sub)
        if scope["group"] == "all":
            groups.setdefault("all", [])
        for key, members in groups.items():
            gtr = _Trace()
            # only_if reads the group's own record: false, no item; unknown, no count.
            head = self.records.get(key) or (members[0] if members else None)
            shown = self._all(counter.get("only_if", []), head, head, gtr)
            if shown is False:
                continue
            ltr = _Trace()
            limit = as_number(self._rule_value(counter["limit_rule"], self.today, ltr))
            value, unit, counted = self._calculate(counter, members, gtr)
            for could in (None, key):
                if could in held:
                    gtr.merge(held[could])
                    value = None
            gtr.merge(lists)
            if lists.lists or shown is None:
                value = None
            self._need(gtr)
            self._need(ltr)
            rules = _unique([*counter["rule_ids"], counter["limit_rule"], *gtr.rules, *ltr.rules])
            item_id = f"{counter[ID]}.{key}"
            # Point 24: a withheld count is still shown, null, with what it waits on.
            waits = [] if value is not None else self._waits(gtr)
            if value is None and not waits:
                self._engine_gap(item_id)
            self._item(item_id, value, unit, gtr.inputs, rules, None, waits=waits)
            if counted is not None:
                # SPEC-W2 point 46, N2: the day the count would reach its limit if nothing in
                # the record changes, the limit-th day counted. Past today it waits on every
                # not-yet end it runs through (point 22).
                reached = None
                if value is None:
                    day_waits = waits
                elif limit is None:
                    day_waits = self._waits(ltr)
                else:
                    if 0 < limit <= len(counted):
                        reached = sorted(counted)[int(limit) - 1]
                    day_waits = []
                    if gtr.pending and (reached is None or reached > self.today):
                        reached, day_waits = None, self._waits(_Trace(pending=gtr.pending))
                self._item(
                    f"{item_id}.limit_day",
                    reached,
                    "date",
                    gtr.inputs,
                    rules,
                    None,
                    waits=day_waits,
                )
            if value is not None and limit is not None:
                result[key] = value >= limit
                if result[key]:
                    self._judge(f"{counter[ID]}.at_or_over_limit.{key}")
        return result

    def _group_key(self, scope: Json, record: Json, tr: _Trace) -> str | None:
        """The group a record joins, or None when its key is not known (point 19). A chain
        link that is absent or stated none starts a chain."""
        group = scope["group"]
        if group == "record":
            return str(record[ID])
        if group == "chain":
            name = scope.get("chain_link", "")
            if self._read_own(record, name)[0] == "absent":
                return str(record[ID])
            link = self._read(f"{THIS}.{name}", record, None, tr)
            return link if isinstance(link, str) and link in self.records else None
        if group == "same_value":
            value = self._read(scope.get("value_of", ""), record, None, tr)
            return None if value is ABSENT else str(value)
        return "all"

    def _span_of(self, counter: Json, record: Json, tr: _Trace) -> Any:
        span = counter["span"]
        starts = self._when3(span["starts"], record, None, tr)
        ends = self._when3(span["ends"], record, None, tr)
        name = str(span["ends"].get("fact", span["starts"].get("fact", ""))).split(".")[-1]
        return self._dated(record, starts, ends, name, self.today, tr)

    def _dated(
        self, record: Json, starts: Any, ends: Any, name: str, runs_to: date, tr: _Trace
    ) -> Any:
        """A span as (first day, last day), NONE when it does not apply, or ABSENT when not
        known (SPEC-W2-UNKNOWN point 22). A not-yet end runs to runs_to, named pending by its
        read; an end before its start is the conflict span_order.<record>."""
        if starts is NONE or ends is NONE:
            return NONE
        if not isinstance(starts, date):
            return ABSENT
        if ends is NOT_YET:
            ends = max(runs_to, starts - ONE_DAY)
        if not isinstance(ends, date):
            return ABSENT
        if ends < starts:
            cid = f"span_order.{record[ID]}"
            about = {"starts": starts.isoformat(), "ends": ends.isoformat()}
            self._conflict(cid, about, record[ID], (name, "conflict"))
            tr.named.append(cid)
            return ABSENT
        return starts, ends

    def _calculate(
        self, counter: Json, members: list[Json], tr: _Trace
    ) -> tuple[float | None, str, list[date] | None]:
        """The count, its unit, and for a count of days every day it counts or would count
        while nothing in the record changes. None when not known, its gaps in the trace."""
        calculator = counter["calculator"]
        if calculator == "count_of_records":
            return len(members), "count", None
        unit = "months" if calculator == "sum_of_months" else "days"
        counted: list[date] | None = None if unit == "months" else []
        spans = [self._span_of(counter, r, tr) for r in members]
        for record, span in zip(members, spans, strict=True):
            if span is NONE:
                # Point 22a: a counted record whose span does not apply adds days not known.
                judgement = f"{counter[ID]}.span_not_known.{record[ID]}"
                self._judge(judgement)
                tr.named.append(judgement)
        known = [s for s in spans if isinstance(s, tuple)]
        if len(known) != len(spans):
            return None, unit, counted
        if calculator == "sum_of_months":
            months, days = 0, 0
            for starts, ends in known:
                after = ends + ONE_DAY
                whole = 0
                while add_months(starts, whole + 1) <= after:
                    whole += 1
                months += whole
                days += (after - add_months(starts, whole)).days
            tr.inputs["days"] = days
            return months, unit, None
        if calculator == "sum_of_days":
            covered: set[date] = set()
            for starts, ends in known:
                covered |= {starts + timedelta(days=n) for n in range((ends - starts).days + 1)}
            return len(covered), unit, list(covered)
        all_without: list[list[date] | None] = [
            self._days_without(counter, record, starts, ends, tr)
            for record, (starts, ends) in zip(members, known, strict=True)
        ]
        found = [day for without in all_without if without is not None for day in without]
        if any(without is None for without in all_without):
            return None, unit, []
        return sum(1 for day in found if day <= self.today), unit, found

    def _days_without(
        self, counter: Json, record: Json, starts: date, ends: date, tr: _Trace
    ) -> list[date] | None:
        """Days in the span no qualifying record covers, the days after today as they stand
        while nothing in the record changes, a span not yet started as well. None when not
        known (point 21): an hours rule not in force filters nothing (point 23)."""
        hours_limit = None
        if "hours_rule" in counter:
            hours_limit = as_number(self._rule_value(counter["hours_rule"], self.today, tr))
            if hours_limit is None:
                return None
        jobs = self._covered(counter["qualifying"], record, starts, ends, hours_limit, tr)
        others: set[date] | None = set()
        if "not_qualifying" in counter:
            others = self._covered(counter["not_qualifying"], record, starts, ends, None, tr)
        if jobs is None or others is None:
            return None
        days = (starts + timedelta(days=n) for n in range((ends - starts).days + 1))
        return [day for day in days if day not in jobs - others]

    def _covered(
        self,
        selector: Json,
        outer: Json,
        starts: date,
        ends: date,
        hours_limit: float | None,
        tr: _Trace,
    ) -> set[date] | None:
        """The days from starts to ends the selected records cover, or None when a record
        that could count is undecided or its hours or days are not known (point 21). Its
        known days lying wholly outside exempt it. Unknown hours never mean no job."""
        self._use_kind(selector["record"])
        chosen, undecided = self._choose(selector, outer)
        covered: set[date] = set()
        known = True
        for record, sub in [*((r, None) for r in chosen), *undecided]:
            rtr = sub or _Trace()
            counts = sub is None
            if counts and hours_limit is not None:
                hours = self._read(f"{THIS}.{PERIOD_HOURS}", record, outer, rtr)
                if hours is not ABSENT and (as_number(hours) or 0) < hours_limit:
                    tr.inputs.update(rtr.inputs)
                    continue
                counts = hours is not ABSENT
            days = self._days_of(record, starts, ends, rtr)
            if counts and days is not None:
                covered |= days
                tr.merge(rtr)
            elif rtr.named or not self._outside(record, starts, ends):
                tr.merge(rtr)
                known = False
        return covered if known else None

    def _outside(self, record: Json, starts: date, ends: date) -> bool:
        """Whether a record's known first or last day puts it wholly outside the days."""
        span = self._span_fields(record["kind"])
        if span is None:
            return True
        first_state, first = self._read_own(record, span[0])
        last_state, last = self._read_own(record, span[1])
        return (first_state == "known" and isinstance(first, date) and first > ends) or (
            last_state == "known" and isinstance(last, date) and last < starts
        )

    def _span_fields(self, kind: str) -> tuple[str, str] | None:
        """The fields that hold a record's first and last day: the first two date fields
        its kind declares (work: start, end; trip: left_on, returned_on). A reading."""
        dates = [
            f[ID] for f in self.kinds.get(kind, {}).get("fields", []) if f["kind"] == DATE_KIND
        ]
        first, last = dates[:1], dates[1:][:1]
        return (first[0], last[0]) if first and last else None

    def _days_of(self, record: Json, starts: date, ends: date, tr: _Trace) -> set[date] | None:
        """The days from starts to ends a record covers, or None when not known. A not-yet
        end runs to ends, as it stands while nothing changes."""
        span = self._span_fields(record["kind"])
        if span is None:
            return set()
        first = self._when3({"fact": f"{THIS}.{span[0]}"}, record, None, tr)
        last = self._when3({"fact": f"{THIS}.{span[1]}"}, record, None, tr)
        dated = self._dated(record, first, last, span[1], ends, tr)
        if dated is NONE:
            return set()
        if not isinstance(dated, tuple):
            return None
        first, last = max(dated[0], starts), min(dated[1], ends)
        return {first + timedelta(days=n) for n in range((last - first).days + 1)}

    # Lists, typed dates and the end of the record.

    def complete_questions(self) -> list[str]:
        open_lists = []
        for kind in self.used_kinds:
            if not self._stated(kind):
                qid = f"complete.{kind}"
                open_lists.append(qid)
                self._ask(qid, f"unconfirmed:{qid}", None, None, (kind, "list"))
        return open_lists

    def typed_dates(self) -> list[str]:
        """D59: the soft reasons while a typed date is not checked against a document."""
        typed: Json = {}
        for record in self.records.values():
            for name, value in record["fields"].items():
                if self._decl(record, name).get("kind") == "date" and as_date(value):
                    typed[f"{record[ID]}.{name}"] = value
        for fact in self.path.get("facts", []):
            value = self.facts.get(fact[ID])
            if fact["kind"] == "date" and as_date(value):
                typed[fact[ID]] = value
        if not typed:
            return [NO_DOCUMENTS]
        if self._answer(FROM_DOCUMENTS, typed) is not True:
            self._ask(FROM_DOCUMENTS, UNCONFIRMED_TYPED, typed, None)
            return [NO_DOCUMENTS, UNCONFIRMED_TYPED]
        checked = 0
        for name, value in typed.items():
            about = {name: value}
            fine = self._answer(CHECKED + name, about) is True
            if fine and not any(name in c or c.startswith(name) for c in self.conflicts):
                checked += 1
            else:
                self._ask(CHECKED + name, UNCONFIRMED_TYPED, about, None)
        reasons = [] if checked else [NO_DOCUMENTS]
        if checked < len(typed):
            reasons.append(UNCONFIRMED_TYPED)
        return reasons

    def ends_before_today(self) -> list[str]:
        ends = self.span_ends
        if not ends or any(e is None or e >= self.today for e in [*ends, *self.maybe_ends]):
            return []
        last = max(e for e in ends if e is not None)
        about = {"ends": last.isoformat()}
        answer = self._answer(ENDS_BEFORE_TODAY, about)
        if answer is False:
            self._judge(ENDS_BEFORE_TODAY)
            return []
        self._ask(ENDS_BEFORE_TODAY, f"unconfirmed:{ENDS_BEFORE_TODAY}", about, None)
        return [f"unconfirmed:{ENDS_BEFORE_TODAY}"]

    # Rules shown.

    def _rules(self, rule_ids: Iterable[str]) -> None:
        for rule_id in rule_ids:
            if rule_id not in self.used_rules:
                self.used_rules.append(rule_id)

    def _row_shown(self, rule_id: str) -> Json | None:
        if rule_id in self.rows_used:
            return self.rows_used[rule_id]
        row = self.pack.value(rule_id, self.today)
        if row is not None:
            return row
        rows = [p for p in self.pack.parameters if p[ID] == rule_id]
        return rows[0] if rows else None

    def _status(self, rule_ids: list[str]) -> str:
        ranks = [
            STATUS_ORDER.index(row["status"])
            for r in rule_ids
            if (row := self._row_shown(r)) is not None
        ]
        return STATUS_ORDER[max(ranks, default=0)]

    def _reading(self, rule_ids: list[str]) -> bool:
        rows = [self._row_shown(r) for r in rule_ids]
        return any(row is not None and row.get("derivation") == "reading" for row in rows)

    def rules_out(self) -> Json:
        out: Json = {}
        for rule_id in self.used_rules:
            row = self._row_shown(rule_id)
            if row is None:
                continue
            source = row["source"]
            entry: Json = {
                "value": row["value"],
                "unit": row["unit"],
                "status": row["status"],
                "citation": source["citation"],
                "url": source["url"],
                "checked_on": source["checked_on"],
            }
            for key in ("regime", "derivation", "note", "plain"):
                if key in row:
                    entry[key] = row[key]
            if "quote" in source:
                entry["quote"] = source["quote"]
            out[rule_id] = entry
        return out

    def litigated(self) -> bool:
        """Product-1 points 25 and 49: only an item shown whose rule has an alternate with a
        different value."""
        return bool(self.differ)


def _covered(pack: Rulepack | None) -> bool:
    return pack is not None and pack.path is not None and bool(pack.path.get("stages"))


def compute(case: Json, packs: list[Rulepack], clock: Clock) -> Json:
    """The engine output for a records case, read from each category's pack path."""
    today = day_in_zone(clock, case["time_zone"])
    by_category = {p.category: p for p in packs}
    categories: list[str] = list(case["categories"])
    records: list[Json] = list(case.get("records", []))
    for record in records:
        if record.get("category", categories[0]) not in categories:
            raise CaseStructureError("records: a record names a category the case does not list")

    hard: list[str] = []
    soft: list[str] = []
    runs: list[_Run] = []
    settings = load_settings()
    for category in categories:
        pack = by_category.get(category)
        if pack is None or not _covered(pack):
            hard.append(f"{NOT_COVERED}{category}")
            continue
        own = [r for r in records if r.get("category", categories[0]) == category]
        run = _Run(case, pack, today, own, settings)
        run._refuse_undeclared(own)
        run.ask_unreadable()
        runs.append(run)
    for run in runs:
        run.run_checks()
        run.run_stages()
        run.run_counters()
        run.withhold_outputs()
        soft += run.ends_before_today()
        hard += run.complete_questions()
    for run in runs:
        soft += run.typed_dates()
    if not runs:
        soft.append(NO_DOCUMENTS)

    checked = [p.rules_checked_on for p in packs if p.category in categories]
    known = [d for d in checked if d is not None]
    rules_checked_on = min(known) if known and len(known) == len(checked) else None
    soft = _unique(soft)
    # SPEC-W2-UNKNOWN point 37: one verdict function. A typed date not yet checked against a
    # document, and every open question, block like any other.
    verdict = decide(
        VerdictInputs(
            documents_count=0 if NO_DOCUMENTS in soft else 1,
            missing_inputs=tuple(m for run in runs for m in run.missing),
            conflicting_inputs=tuple(c for run in runs for c in run.conflicts),
            rules_checked_on=rules_checked_on,
            depends_on_litigated_rule=any(run.litigated() for run in runs),
            judgement_items=tuple(_unique(j for run in runs for j in run.judgements)),
            open_items=tuple(o for run in runs for o in run.open_items),
            open_questions=tuple(
                q.removeprefix(UNCONFIRMED)
                for q in [*soft, *hard]
                if q != NO_DOCUMENTS and not q.startswith(NOT_COVERED)
            ),
            unreadable_inputs=tuple(u for run in runs for u in run.unreadable),
            undecided_inputs=tuple(u for run in runs for u in run.undecided),
            engine_gaps=tuple(g for run in runs for g in run.engine_gaps),
            categories_not_covered=tuple(
                q.removeprefix(NOT_COVERED) for q in hard if q.startswith(NOT_COVERED)
            ),
        ),
        clock,
        today,
    )

    questions: dict[str, Json] = {}
    for run in runs:
        for qid, question in run.questions.items():
            questions.setdefault(qid, question)
    rules: Json = {}
    for run in runs:
        rules.update(run.rules_out())
    upcoming = sorted((u for run in runs for u in run.upcoming), key=lambda u: (u["date"], u[ID]))
    return {
        "verdict": {"state": verdict.state.value, "reasons": _unique(verdict.reasons)},
        "scope": {
            "documents_count": 0,
            "rules_checked_on": None if rules_checked_on is None else rules_checked_on.isoformat(),
        },
        "computed": [c for run in runs for c in run.computed],
        "lists": [entry for run in runs for entry in run.lists],
        "questions": list(questions.values()),
        "rulepacks": [
            {"category": p.category, "version": p.version}
            for p in packs
            if p.category in categories
        ],
        "rules": rules,
        "today": {"date": today.isoformat(), "time_zone": case["time_zone"]},
        "upcoming": upcoming,
        "stages": [s for run in runs for s in run.stages],
        "checklists": [c for run in runs for c in run.checklists],
        "answers_read": _unique(a for run in runs for a in run.answers_read),
    }
