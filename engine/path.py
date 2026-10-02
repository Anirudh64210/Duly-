"""A reader of any pack's path over records (specs/path-1/SPEC.md, programs.md 10 to 13).

The engine holds no scenario of its own. Every kind, field, choice, stage, window and
rule it reads comes from the pack; every date is a fact moved by the pack's sourced rule
amounts. Nothing here names a category, a record kind, a field or a rule of any pack.
"""

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

from engine.clocks import Clock, day_in_zone
from engine.dates import add_months, add_years, is_business_day
from engine.rulepack import Rulepack
from engine.settings import load_settings, whole_setting
from engine.verdict import RULES_STALE_AFTER, VerdictState

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


def _as_date(value: Any) -> date | None:
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def _number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    return float(value)


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
    rules: list[str] = field(default_factory=list)
    inputs: Json = field(default_factory=dict)
    lapsed: list[str] = field(default_factory=list)
    differ: list[str] = field(default_factory=list)
    optional_used: bool = False
    planning: bool = False

    def merge(self, other: "_Trace") -> None:
        self.missing += other.missing
        self.unsure += other.unsure
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
        self.stage_decls: dict[str, Json] = {s[ID]: s for s in self.path.get("stages", [])}
        self.computed: list[Json] = []
        self.upcoming: list[Json] = []
        self.stages: list[Json] = []
        self.checklists: list[Json] = []
        self.questions: dict[str, Json] = {}
        self.missing: list[str] = []
        self.conflicts: list[str] = []
        self.judgements: list[str] = []
        self.open_items: list[str] = []
        self.answers_read: list[str] = []
        self.used_rules: list[str] = []
        self.rows_used: dict[str, Json] = {}
        self.used_kinds: list[str] = []
        self.span_ends: list[date | None] = []
        self.virtual: set[int] = set()
        self.lists: list[Json] = []
        self.differ: list[str] = []

    # Reading the record.

    def _refuse_undeclared(self) -> None:
        for record in self.records.values():
            kind = record["kind"]
            if kind not in self.kinds:
                raise ValueError(f"records: the kind {kind} is not declared by the pack")
            for name in record["fields"]:
                if name not in self.fields[kind]:
                    raise ValueError(f"records: the field {name} is not declared for {kind}")

    def ask_unknown_choices(self) -> None:
        """A choice value outside the pack's list is missing and asked, never taken in silence
        (resolutions point 24)."""
        for record in self.records.values():
            for name, value in record["fields"].items():
                if self._outside_choices(record, name, value):
                    self._need(_Trace(missing=[(f"{record[ID]}.{name}", record[ID])]))

    def _outside_choices(self, record: Json, name: str, value: Any) -> bool:
        decl = self._decl(record, name)
        if decl.get("kind") != "choice" or value is ABSENT or value is None:
            return False
        return value not in decl.get("choices", []) and value != NOT_SURE

    def _decl(self, record: Json, name: str) -> Json:
        return self.fields.get(record["kind"], {}).get(name, {})

    def _field(self, record: Json, name: str, on: date | None) -> Any:
        value = self._as_given(record, name, on)
        return ABSENT if self._outside_choices(record, name, value) else value

    def _as_given(self, record: Json, name: str, on: date | None) -> Any:
        value = record["fields"].get(name, ABSENT)
        history = self._decl(record, name).get("history")
        if on is None or history is None:
            return value
        self._use_kind(history["record"])
        changes = []
        for other in self.records.values():
            fields = other["fields"]
            if other["kind"] != history["record"] or fields.get(history["link"]) != record[ID]:
                continue
            start = _as_date(fields.get(history["from"]))
            if start is not None:
                changes.append((start, fields.get(history["old"], ABSENT)))
        for start, old in sorted(changes, key=lambda change: change[0]):
            if start > on:
                return old
        return value

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
            value = record[ID] if part == ID else self._field(record, part, on if last else None)
            asked = None if id(record) in self.virtual else f"{record[ID]}.{part}"
            owner = None if asked is None else record[ID]
            if last:
                return value, asked, owner
            if not isinstance(value, str) or value not in self.records:
                return ABSENT, asked, owner
            record = self.records[value]
        return ABSENT, None, None

    def _read(self, path: str, this: Json | None, outer: Json | None, tr: _Trace) -> Any:
        """A value for a condition: ABSENT or not_sure is noted in the trace."""
        value, asked, owner = self._resolve(path, this, outer)
        if value is ABSENT or value is None:
            if asked is not None:
                tr.missing.append((asked, owner))
            return ABSENT
        if value == NOT_SURE:
            if asked is not None:
                tr.unsure.append((asked, owner))
            return ABSENT
        tr.inputs[asked or path] = value
        return value

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
            setting_id = amount["setting"]
            value: float | None = whole_setting(self.settings, setting_id)
            entry = next(e for e in self.settings["settings"] if e.get(ID) == setting_id)
            unit = str(entry["unit"]).replace(" ", "_")
            tr.planning = True
        else:
            row = self._row(amount["rule"], day, tr)
            if row is None:
                return None
            value, unit = _number(row["value"]), row["unit"]
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
        members = w.get("earliest_of") or w.get("latest_of")
        day: date | None
        if members:
            found: list[date] = []
            whole = True
            for member in members:
                sub = _Trace()
                got = self._when(member, this, outer, sub)
                if got is None and member.get("optional") and not sub.lapsed:
                    continue
                tr.merge(sub)
                if got is None:
                    whole = False
                else:
                    found.append(got)
                    if member.get("optional"):
                        tr.optional_used = True
            if not whole or not found:
                return None
            day = min(found) if w.get("earliest_of") else max(found)
        elif "first" in w:
            day = self._first(w["first"], this, tr)
        elif "month_day_rule" in w:
            day = self._month_day_when(w, this, outer, tr)
        elif "window_opens" in w or "window_closes" in w:
            return None
        elif "fact" in w:
            on = None
            if "as_of" in w:
                on = self._when(w["as_of"], this, outer, _Trace()) or self.today
            value, asked, owner = self._resolve(w["fact"], this, outer, on)
            day = _as_date(value)
            if day is None:
                if asked is not None and (value is ABSENT or value is None):
                    tr.missing.append((asked, owner))
                return None
            tr.inputs[asked or w["fact"]] = day.isoformat()
        else:
            return None
        if day is None:
            return None
        for amount in w.get("add", []):
            moved = self._amount(day, amount, tr)
            if moved is None:
                return None
            day = moved
        if w.get("day_before"):
            day -= ONE_DAY
        if w.get("day_after"):
            day += ONE_DAY
        return day

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

    def _first(self, first: Json, outer: Json | None, tr: _Trace) -> date | None:
        found = self._select(first["of"], outer, tr)
        days = [
            d
            for r in found or []
            if (d := _as_date(self._resolve(f"{THIS}.{first['field']}", r, outer)[0])) is not None
        ]
        if not days:
            return None
        return min(days) if first["pick"] == "earliest" else max(days)

    # Conditions: True, False or None for unknown.

    def _select(self, selector: Json, outer: Json | None, tr: _Trace) -> list[Json] | None:
        kind = selector["record"]
        self._use_kind(kind)
        chosen: list[Json] = []
        unknown = False
        for record in self.records.values():
            if record["kind"] != kind:
                continue
            held = self._all(selector.get("where", []), record, outer, tr)
            if held is None:
                unknown = True
            elif held:
                chosen.append(record)
        return None if unknown else chosen

    def _all(
        self, conditions: list[Json], this: Json | None, outer: Json | None, tr: _Trace
    ) -> bool | None:
        # A condition known to fail settles the whole: nothing the others read is asked.
        subs: list[_Trace] = []
        unknown = False
        for c in conditions:
            sub = _Trace()
            result = self._cond(c, this, outer, sub)
            if result is False:
                return False
            unknown = unknown or result is None
            subs.append(sub)
        for sub in subs:
            tr.merge(sub)
        return None if unknown else True

    def _cond(self, c: Json, this: Json | None, outer: Json | None, tr: _Trace) -> bool | None:
        results: list[bool | None] = []
        value: Any = ABSENT
        if "field" in c:
            if "present" in c:
                raw, _, _ = self._resolve(c["field"], this, outer)
                there = raw is not ABSENT and raw is not None
                results.append(there == c["present"])
            else:
                value = self._read(c["field"], this, outer, tr)
        known = value is not ABSENT
        if "in" in c:
            results.append(str(value) in c["in"] if known else None)
        for key in ("on_or_before", "on_or_after", "before", "after"):
            if key in c:
                results.append(self._compare_dates(key, value, c[key], this, outer, tr))
        for key in ("level_above", "level_same", "level_below"):
            if key in c:
                results.append(self._level(key, value, c[key], c["field"], this, outer, tr))
        for key in ("same_as", "differs_from"):
            if key in c:
                other = self._read(c[key], this, outer, tr)
                same = None if not known or other is ABSENT else value == other
                results.append(same if same is None or key == "same_as" else not same)
        if "month_day_is" in c:
            day = _as_date(value)
            text = None if day is None else self._rule_value(c["month_day_is"], day, tr)
            placed = None if day is None else _month_day(text, day.year)
            results.append(None if placed is None or day is None else placed == day)
        if "at_most" in c:
            number = _number(value)
            limit = _number(self._rule_value(c["at_most"]["rule"], self.today, tr))
            results.append(None if number is None or limit is None else number <= limit)
        for key in ("exists", "none"):
            if key in c:
                found = self._select(c[key], this, tr)
                results.append(None if found is None else bool(found) == (key == "exists"))
        for key in ("count_below", "count_at_most"):
            if key in c:
                found = self._select(c[key]["of"], this, tr)
                limit = _number(self._rule_value(c[key]["rule"], self.today, tr))
                if found is None or limit is None:
                    results.append(None)
                elif key == "count_below":
                    results.append(len(found) < limit)
                else:
                    results.append(len(found) <= limit)
        if "any_of" in c:
            results.append(self._any(c["any_of"], this, outer, tr))
        if "all_of" in c:
            results.append(self._all(c["all_of"], this, outer, tr))
        if "not" in c:
            inner = self._cond(c["not"], this, outer, tr)
            results.append(None if inner is None else not inner)
        if not results:
            results.append(None if not known else True)
        if False in results:
            return False
        return None if None in results else True

    def _any(
        self, conditions: list[Json], this: Json | None, outer: Json | None, tr: _Trace
    ) -> bool | None:
        # A condition known to hold settles the whole: nothing the others read is asked.
        subs: list[_Trace] = []
        unknown = False
        for c in conditions:
            sub = _Trace()
            result = self._cond(c, this, outer, sub)
            if result is True:
                return True
            unknown = unknown or result is None
            subs.append(sub)
        for sub in subs:
            tr.merge(sub)
        return None if unknown else False

    def _compare_dates(
        self, key: str, value: Any, w: Json, this: Json | None, outer: Json | None, tr: _Trace
    ) -> bool | None:
        day = _as_date(value)
        other = self._when(w, this, outer, tr)
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
        for order in self.path.get("order", []):
            if order["field"] != name:
                continue
            tr.rules += order["rule_ids"]
            ranks: list[str] = list(order["ascending"])
            # The other side is one of the listed choices itself, or a path to read.
            other = other_path if other_path in ranks else self._read(other_path, this, outer, tr)
            if value not in ranks or other not in ranks:
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

    def _ask(self, qid: str, because: str, about: Json | None, record: str | None) -> None:
        question: Json = {ID: qid, "because": [because]}
        if about is not None:
            question["about"] = about
        if record is not None:
            question["record"] = record
        self.questions.setdefault(qid, question)

    def _need(self, tr: _Trace) -> None:
        for rule_id in tr.differ:
            if rule_id not in self.differ:
                self.differ.append(rule_id)
        for name, record in tr.missing:
            if name not in self.missing:
                self.missing.append(name)
            self._ask(name, f"missing:{name}", None, record)
        for name, _ in tr.unsure:
            self._judge(f"{name}.{NOT_SURE}")
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
        on = _as_date(given.get("on"))
        if on is None or on > self.today:
            return None
        if about is not None and given.get("about", about) != about:
            return None
        self.answers_read.append(qid)
        return bool(given["answer"])

    def _conflict(self, cid: str, about: Json, record: str | None) -> None:
        if self._answer(cid, about) is True:
            self._judge(cid)
            return
        if cid not in self.conflicts:
            self.conflicts.append(cid)
        self._ask(cid, f"conflict:{cid}", about, record)

    # Stages.

    def run_stages(self) -> None:
        for stage in self.path.get("stages", []):
            selector = stage.get("for_each")
            tr = _Trace()
            records: list[Json | None] = (
                list(self._select(selector, None, tr) or []) if selector else [None]
            )
            for record in records:
                entered = all(
                    self._resolve(p, record, record)[0] not in (ABSENT, None)
                    for p in stage["entered_when"]
                )
                if entered:
                    self._enter(stage, record, None)

    def _enter(self, stage: Json, record: Json | None, next_of: Json | None) -> None:
        rid = None if record is None else record[ID]
        sid = stage[ID] if rid is None else f"{stage[ID]}.{rid}"
        tr = _Trace()
        span = stage.get("span") or {}
        starts = self._when(span["starts"], record, record, tr) if span else None
        ends = self._when(span["ends"], record, record, tr) if span else None
        rule_ids = list(stage["rule_ids"])
        if next_of is None and span:
            ends = self._ends_also(stage, span, ends, record, rule_ids, tr)
            self._span_conflicts(sid, span, starts, ends, rid, tr)
            self.span_ends.append(ends)
        items: list[str] = []
        windows: list[Json] = []
        for window in stage.get("windows", []):
            windows.append(self._window(window, record, rid, items, rule_ids, next_of is not None))
        if next_of is None:
            self._need(tr)
        else:
            self._need(_Trace(unsure=tr.unsure, lapsed=tr.lapsed, differ=tr.differ))
        self._rules(rule_ids)
        state = "next" if next_of is not None else self._state(span, starts, ends, windows)
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
        by its windows."""
        if not span:
            opens = [d for w in windows if (d := _as_date(w["opens"])) is not None]
            closes = [d for w in windows if (d := _as_date(w["closes"])) is not None]
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
            day = self._when(other["when"], record, record, sub)
            rule_ids += other["rule_ids"]
            if day is None or not sub.optional_used:
                continue
            tr.merge(sub)
            if ends is not None and day != ends:
                rid = "" if record is None else f".{record[ID]}"
                self._judge(f"{stage[ID]}.end_by_source{rid}")
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
    ) -> None:
        if starts is None or ends is None:
            return
        about = {"starts": starts.isoformat(), "ends": ends.isoformat()}
        if ends < starts:
            self._conflict(f"{sid}.ends_before_starts", about, rid)
            return
        longest = span.get("longest")
        if longest is not None:
            limit = self._amount(starts, longest, tr)
            self._rules([longest["rule"]])
            if limit is not None and ends > limit:
                self._conflict(f"{sid}.longer_than_longest", about, rid)

    def _window(
        self,
        window: Json,
        record: Json | None,
        rid: str | None,
        items: list[str],
        stage_rules: list[str],
        is_next: bool,
    ) -> Json:
        done = any(
            self._resolve(p, record, record)[0] not in (ABSENT, None)
            for p in window.get("done_when", [])
        )
        suffix = "" if rid is None else f".{rid}"
        dates: dict[str, date | None] = {}
        all_rules: list[str] = list(window["rule_ids"])
        inputs: Json = {}
        traces: dict[str, _Trace] = {}
        for end in ("opens", "closes"):
            tr = traces[end] = _Trace()
            dates[end] = self._when(window[end], record, record, tr)
            if is_next:
                self._need(_Trace(unsure=tr.unsure, lapsed=tr.lapsed, differ=tr.differ))
            else:
                self._need(tr)
        # A window either of whose days a product setting moves is a planning window, and so
        # are both its items (SPEC-W2 point 46, N1).
        planning = any(tr.planning for tr in traces.values())
        for end, tr in traces.items():
            rules = _unique([*window["rule_ids"], *tr.rules])
            all_rules += rules
            inputs.update(tr.inputs)
            item_id = f"{window[ID]}.{end}{suffix}"
            items.append(item_id)
            day = dates[end]
            self._item(item_id, day, "date", tr.inputs, rules, rid, not done, planning)
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
        bound: Json = {}
        for name, source in entry.get("bind", {}).items():
            # A path is read; a choice written in the pack is taken as itself.
            head = str(source).split(".")[0]
            if head in (THIS, OUTER, TODAY) or source in self.facts:
                value, _, _ = self._resolve(source, record, record)
            else:
                value = source
            if value is not ABSENT:
                bound[name] = value
        selector = stage.get("for_each")
        if selector is not None:
            kind = selector["record"]
            for other in self.records.values():
                fields = other["fields"]
                if other["kind"] == kind and all(fields.get(k) == v for k, v in bound.items()):
                    return
            host = record[ID] if record is not None else stage[ID]
            virtual: Json | None = {ID: host, "kind": kind, "fields": bound}
            self.virtual.add(id(virtual))
        else:
            virtual = None
        saved = self._snapshot()
        self._enter(stage, virtual, entry)
        if self._closed(stage, self.stages[-1]):
            self._restore(saved)

    _KEPT = (
        "computed",
        "upcoming",
        "stages",
        "checklists",
        "missing",
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

    def _closed(self, stage: Json, entry: Json) -> bool:
        """A next stage is shown only while a window in which something can be filed has not
        closed (resolutions 6 and 15). Such a window names the facts that record the step as
        taken (done_when); a window without them, such as a date to complete by, is no filing
        and does not keep the stage. A stage with no known close of a filing window is kept."""
        filing = [w.get("done_when") for w in stage.get("windows", [])]
        closes = [_as_date(w["closes"]) for w, d in zip(entry["windows"], filing, strict=True) if d]
        known = [c for c in closes if c is not None]
        return bool(known) and all(c < self.today for c in known)

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
            on = _as_date(given.get("on")) if isinstance(given, dict) else None
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
                decl = self._decl(record, name)
                day = _as_date(value)
                if decl.get("happened") and day is not None and day > self.today:
                    about = {f"{record[ID]}.{name}": value}
                    self._conflict(f"{record[ID]}.{name}.after_today", about, record[ID])
        for check in self.path.get("checks", []):
            selector = check.get("for_each")
            tr = _Trace()
            records: list[Json | None] = (
                list(self._select(selector, None, tr) or []) if selector else [None]
            )
            for target in records:
                self._check(check, target)

    def _check(self, check: Json, record: Json | None) -> None:
        rid = None if record is None else record[ID]
        cid = check[ID] if rid is None else f"{check[ID]}.{rid}"
        tr = _Trace()
        applies = self._all(check.get("only_if", []), record, record, tr)
        if applies is False:
            return
        holds = self._all(check["holds"], record, record, tr) if applies else None
        self._rules(check["rule_ids"])
        if holds is False:
            if check.get("kind") == "judgement":
                self._judge(_judgement_id(check, record) or cid)
            else:
                self._conflict(cid, dict(tr.inputs), rid)
        elif holds is None:
            self._need(tr)

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

    def _stated(self, kind: str) -> bool:
        """The person said the list of this kind is whole, on a day that still covers today."""
        stated: Json = self.case.get("complete", {}) or {}
        grows = bool(self.kinds.get(kind, {}).get("grows_with_time", False))
        for key, statement in stated.items():
            if key != kind and not key.startswith(f"{kind}:"):
                continue
            on = _as_date(statement.get("on")) if isinstance(statement, dict) else None
            if on is not None and not (grows and on < self.today):
                return True
        return False

    def _counter(self, counter: Json) -> dict[str, bool]:
        """The counter's items. Gives, for each group with a known count, whether it is at or
        over the limit."""
        result: dict[str, bool] = {}
        tr = _Trace()
        scope = counter["scope"]
        found = self._select(scope["of"], None, tr)
        self._need(tr)
        if found is None:
            return result
        # A count over a list the person has not stated whole is not known (PRINCIPLES 2):
        # every list the count reads, trips as well as work (product-2 resolution 13).
        read = [counter[k]["record"] for k in ("qualifying", "not_qualifying") if k in counter]
        whole = all(self._stated(kind) for kind in read)
        groups: dict[str, list[Json]] = {}
        for record in found:
            key = self._group_key(scope, record)
            if key is not None:
                groups.setdefault(key, []).append(record)
        if scope["group"] == "all":
            groups.setdefault("all", [])
        for key, members in groups.items():
            gtr = _Trace()
            # only_if reads the group's own record: false, no item; unknown, no count.
            head = self.records.get(key) or (members[0] if members else None)
            shown = self._all(counter.get("only_if", []), head, head, gtr)
            if shown is False:
                continue
            limit = _number(self._rule_value(counter["limit_rule"], self.today, gtr))
            value, unit, over, counted = self._calculate(counter, members, limit, gtr)
            if not whole or shown is None:
                value, over = None, False
            self._need(gtr)
            rules = _unique([*counter["rule_ids"], counter["limit_rule"], *gtr.rules])
            item_id = f"{counter[ID]}.{key}"
            self._item(item_id, value, unit, gtr.inputs, rules, None)
            if counted is not None:
                # SPEC-W2 point 46, N2: the day the count would reach its limit if nothing in
                # the record changes, the limit-th day counted. None when the count is not
                # known or never gets there.
                reached = None
                if value is not None and limit is not None and 0 < limit <= len(counted):
                    reached = sorted(counted)[int(limit) - 1]
                self._item(f"{item_id}.limit_day", reached, "date", gtr.inputs, rules, None)
            if value is not None and limit is not None:
                result[key] = over
            if over:
                self._judge(f"{counter[ID]}.at_or_over_limit.{key}")
        return result

    def _group_key(self, scope: Json, record: Json) -> str | None:
        group = scope["group"]
        if group == "record":
            return str(record[ID])
        if group == "chain":
            link = record["fields"].get(scope.get("chain_link", ""))
            return str(link) if isinstance(link, str) and link in self.records else record[ID]
        if group == "same_value":
            tr = _Trace()
            value = self._read(scope.get("value_of", ""), record, None, tr)
            self._need(tr)
            return None if value is ABSENT else str(value)
        return "all"

    def _span_of(self, counter: Json, record: Json, tr: _Trace) -> tuple[date, date] | None:
        span = counter.get("span")
        if span is None:
            return None
        starts = self._when(span["starts"], record, None, tr)
        ends = self._when(span["ends"], record, None, tr)
        if starts is None or ends is None or ends < starts:
            return None
        return starts, ends

    def _calculate(
        self, counter: Json, members: list[Json], limit: float | None, tr: _Trace
    ) -> tuple[float | None, str, bool, list[date] | None]:
        """The count, its unit, whether it is at or over the limit, and for a count of days
        every day it counts or would count while nothing in the record changes."""
        calculator = counter["calculator"]
        if calculator == "count_of_records":
            count = len(members)
            return count, "count", limit is not None and count >= limit, None
        spans = [self._span_of(counter, r, tr) for r in members]
        if any(s is None for s in spans):
            return None, "days", False, []
        known = [s for s in spans if s is not None]
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
            return months, "months", limit is not None and months >= limit, None
        if calculator == "sum_of_days":
            covered: set[date] = set()
            for starts, ends in known:
                covered |= {starts + timedelta(days=n) for n in range((ends - starts).days + 1)}
            total = len(covered)
            return total, "days", limit is not None and total >= limit, list(covered)
        counted: list[date] = []
        for record, (starts, ends) in zip(members, known, strict=True):
            without = self._days_without(counter, record, starts, ends, tr)
            if without is None:
                return None, "days", False, []
            counted += without
        total_days = sum(1 for day in counted if day <= self.today)
        over = limit is not None and total_days >= limit
        return total_days, "days", over, counted

    def _days_without(
        self, counter: Json, record: Json, starts: date, ends: date, tr: _Trace
    ) -> list[date] | None:
        """Days in the span no qualifying record covers, the days after today as they stand
        while nothing in the record changes. None when it is not known which records
        qualify: an unknown selection is never read as none."""
        if self.today < starts:
            return []
        covered: set[date] = set()
        hours_limit = None
        if "hours_rule" in counter:
            hours_limit = _number(self._rule_value(counter["hours_rule"], self.today, tr))
        jobs = self._select(counter["qualifying"], record, tr)
        if jobs is None:
            return None
        for job in jobs:
            if hours_limit is not None:
                hours = _number(self._read(f"{THIS}.{PERIOD_HOURS}", job, record, tr))
                if hours is None or hours < hours_limit:
                    continue
            covered |= self._days_of(job, starts, ends, tr)
        if "not_qualifying" in counter:
            others = self._select(counter["not_qualifying"], record, tr)
            if others is None:
                return None
            for other in others:
                covered -= self._days_of(other, starts, ends, tr)
        days = (starts + timedelta(days=n) for n in range((ends - starts).days + 1))
        return [day for day in days if day not in covered]

    def _span_fields(self, kind: str) -> tuple[str, str] | None:
        """The fields that hold a record's first and last day: the first two date fields
        its kind declares (work: start, end; trip: left_on, returned_on). A reading."""
        dates = [
            f[ID] for f in self.kinds.get(kind, {}).get("fields", []) if f["kind"] == DATE_KIND
        ]
        first, last = dates[:1], dates[1:][:1]
        return (first[0], last[0]) if first and last else None

    def _days_of(self, record: Json, starts: date, ends: date, tr: _Trace) -> set[date]:
        span = self._span_fields(record["kind"])
        if span is None:
            return set()
        first = _as_date(self._read(f"{THIS}.{span[0]}", record, None, tr))
        last = _as_date(record["fields"].get(span[1])) or ends
        if first is None:
            return set()
        first, last = max(first, starts), min(last, ends)
        return {first + timedelta(days=n) for n in range((last - first).days + 1)}

    # Lists, typed dates and the end of the record.

    def complete_questions(self) -> list[str]:
        open_lists = []
        stated: Json = self.case.get("complete", {})
        for kind in self.used_kinds:
            statement = stated.get(kind)
            on = _as_date(statement.get("on")) if isinstance(statement, dict) else None
            grows = bool(self.kinds.get(kind, {}).get("grows_with_time", False))
            if on is None or (grows and on < self.today):
                qid = f"complete.{kind}"
                open_lists.append(qid)
                self._ask(qid, f"unconfirmed:{qid}", None, None)
        return open_lists

    def typed_dates(self) -> list[str]:
        """D59: the soft reasons while a typed date is not checked against a document."""
        typed: Json = {}
        for record in self.records.values():
            for name, value in record["fields"].items():
                if self._decl(record, name).get("kind") == "date" and _as_date(value):
                    typed[f"{record[ID]}.{name}"] = value
        for fact in self.path.get("facts", []):
            value = self.facts.get(fact[ID])
            if fact["kind"] == "date" and _as_date(value):
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
        if not ends or any(e is None or e >= self.today for e in ends):
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
            raise ValueError("records: a record names a category the case does not list")

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
        run._refuse_undeclared()
        run.ask_unknown_choices()
        runs.append(run)
    for run in runs:
        run.run_checks()
        run.run_stages()
        run.run_counters()
        soft += run.ends_before_today()
        hard += run.complete_questions()
    for run in runs:
        soft += run.typed_dates()
    if not runs:
        soft.append(NO_DOCUMENTS)

    checked = [p.rules_checked_on for p in packs if p.category in categories]
    known = [d for d in checked if d is not None]
    rules_checked_on = min(known) if known and len(known) == len(checked) else None
    missing = [m for run in runs for m in run.missing]
    conflicts = [c for run in runs for c in run.conflicts]
    judgements = _unique(j for run in runs for j in run.judgements)
    open_items = [o for run in runs for o in run.open_items]
    blockers = [f"missing:{m}" for m in missing] + [f"conflict:{c}" for c in conflicts]
    blockers += [f"unconfirmed:{q}" for q in hard if not q.startswith(NOT_COVERED)]
    blockers += [q for q in hard if q.startswith(NOT_COVERED)]
    if rules_checked_on is None:
        blockers.append("rules_never_checked")
    elif today - rules_checked_on > RULES_STALE_AFTER:
        blockers.append("rules_stale")
    if any(run.litigated() for run in runs):
        blockers.append("rule_in_litigation")
    soft = _unique(soft)

    if blockers:
        state, reasons = VerdictState.CANNOT_TELL, [*soft, *blockers, *judgements]
    elif judgements:
        state, reasons = VerdictState.TALK_TO_DSO, [*judgements, *soft]
    elif soft:
        state, reasons = VerdictState.CANNOT_TELL, soft
    elif open_items:
        state, reasons = VerdictState.NEEDS_YOU, open_items
    else:
        state, reasons = VerdictState.NO_OPEN_ITEMS, []

    questions: dict[str, Json] = {}
    for run in runs:
        for qid, question in run.questions.items():
            questions.setdefault(qid, question)
    rules: Json = {}
    for run in runs:
        rules.update(run.rules_out())
    upcoming = sorted((u for run in runs for u in run.upcoming), key=lambda u: (u["date"], u[ID]))
    return {
        "verdict": {"state": state.value, "reasons": _unique(reasons)},
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
