"""The F-1 engine: dates and counts from the dates a user entered.

Every number has a source. A number that is law comes from the pack by id. A number
that is Duly's own choice comes from the settings by id, and the item lists the id under
duly_settings in its inputs. The engine reports dates and counts. It never says what
they mean for the user.
"""

import math
from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass
from datetime import date, timedelta
from itertools import pairwise
from typing import Any

from engine.clocks import Clock, day_in_zone, zone_named
from engine.dates import add_business_days, add_months, add_years
from engine.rulepack import Rulepack, RulepackError
from engine.settings import load_settings, whole_setting
from engine.verdict import VerdictInputs, decide

# SPEC, "Rules of the house": from strongest to weakest.
STATUS_ORDER = ("settled", "guidance", "school", "litigated", "proposed")

# The final evaluation kept its place among the open items when its name changed.
OPEN_ITEM_ENDINGS = ("_due", "_due_from_ead_end", "file_by", "window_closes")
# SPEC-resolutions point 20: dated items of one employment period, numbered as the period.
OPEN_ITEM_PREFIXES = ("stem.new_plan_due.", "stem.concluding_evaluation_due.")
CAP_GAP_ACTIVE = ("pending", "approved")

# Duly's own choices, in contracts/product_settings.yaml.
LOOKAHEAD = "product.open_item_lookahead_days"
OPT_START_LOOKBACK = "product.opt_start_earliest_years_before_program_end"

# Rules that are law without being the value of one item.
HOLIDAYS_LAW = "calendar.federal_holidays_law"
CPT_BAR = "cpt.full_time_bar_days"
FISCAL_YEAR_START = "capgap.fiscal_year_start_month_day"
REPORT_EMPLOYER = "opt.report_employer_within_days"
STEM_WINDOW_CLOSES = "stem.apply_window_closes_rule"
STEM_FOLLOWS_OPT = "stem.requires_post_completion_opt"
NEW_PLAN = "stem.new_plan_due_days"
EVALUATION_DUE = "stem.evaluation_due_days"
REPORT_INTERRUPTION = "opt.report_interruption"
STEM_REPORTING = "stem.reporting_required"

# SPEC-context, section 4: what Duly asks the person to confirm.
HELD_OPT = "held_post_completion_opt"
NO_EMPLOYMENT = "no_employment_to_record"
CAP_GAP_ALONE = "cap_gap_without_training"

# specs/product-1/SPEC.md, section 2 (D41): nothing entered is not nothing to record.
NOTHING_MORE = "nothing_more_to_record"
CPT_USED = "full_time_cpt_used"
CPT_DAYS = "cpt_full_time_days"

# specs/product-1/SPEC.md, section 4: the items of a step, done once the filing or the
# card of that step is recorded.
STEPS = {
    "opt": (
        "opt.apply_window_opens",
        "opt.apply_window_closes",
        "opt.file_by",
        "opt.latest_start",
    ),
    "stem": ("stem.apply_window_opens", "stem.apply_window_closes", "stem.file_by"),
}

# specs/product-1/SPEC.md, section 6: what the regulation lists for the step after OPT.
STEM_LIST = "stem.extension.what_the_regulation_lists"
LISTED_PREFIX = "stem.requires."
CARD_MONTHS = {"opt": "opt.max_months", "stem": "stem.extension_months"}

# Where a question stands. The engine never fills an answer in.
NOT_RAISED = "not_raised"
OPEN = "open"
YES = "yes"
NO = "no"

ONE_DAY = timedelta(days=1)

Value = date | int | None
Values = Mapping[str, Any]


@dataclass(frozen=True)
class EadBlock:
    dso_recommendation_date: date | None
    i765_filed_date: date | None
    ead_start: date | None
    ead_end: date | None


@dataclass(frozen=True)
class EmploymentPeriod:
    start: date
    end: date | None
    hours_per_week: float
    employer_reported: bool


@dataclass(frozen=True)
class CapGap:
    petition_filed_on: date
    requested_start: date
    change_of_status: bool
    status: str


@dataclass(frozen=True)
class Confirmation:
    """The person's own answer to a question, and the day it was given."""

    answer: bool
    on: date
    # The input values the answer was given for. None when the answer carried none.
    about: Mapping[str, Any] | None = None


@dataclass(frozen=True)
class F1Case:
    program_end_date: date
    degree_level: str
    documents_count: int
    # None means nothing was entered. It is never taken as zero.
    cpt_full_time_days: int | None
    opt: EadBlock | None
    stem: EadBlock | None
    employment: tuple[EmploymentPeriod, ...]
    cap_gap: CapGap | None
    time_zone: str
    confirmations: Mapping[str, Confirmation]


# A block the person has confirmed and not yet entered: every date is still to come.
NOT_ENTERED = EadBlock(None, None, None, None)


def _date(raw: Any) -> date | None:
    return None if raw is None else date.fromisoformat(raw)


def _ead_block(raw: Any) -> EadBlock | None:
    if raw is None:
        return None
    return EadBlock(
        dso_recommendation_date=_date(raw["dso_recommendation_date"]),
        i765_filed_date=_date(raw["i765_filed_date"]),
        ead_start=_date(raw["ead_start"]),
        ead_end=_date(raw["ead_end"]),
    )


def _finite(raw: Any, name: str) -> Any:
    """NaN and the infinities pass every comparison in the contract, so they stop here."""
    if isinstance(raw, float) and not math.isfinite(raw):
        raise ValueError(f"{name}: the value sent is not a number")
    return raw


def _confirmations(raw: dict[str, Any], clock: Clock | None) -> dict[str, Confirmation]:
    today = None if clock is None else day_in_zone(clock, raw["time_zone"])
    found = {}
    for question, given in (raw.get("confirmations") or {}).items():
        on = date.fromisoformat(given["on"])
        if today is not None and on > today:
            raise ValueError(f"confirmations: the answer to {question} is dated after today")
        found[question] = Confirmation(answer=given["answer"], on=on, about=given.get("about"))
    return found


def parse_case(raw: dict[str, Any], clock: Clock | None = None) -> F1Case:
    """A case that matches contracts/case_f1.schema.json, as frozen dataclasses.

    Raises ValueError for a number that is NaN, Infinity or -Infinity, and for a
    time zone that does not exist. With a clock, raises ValueError for an answer dated
    after the person's own day."""
    cap_gap = raw.get("cap_gap")
    zone_named(raw["time_zone"])
    return F1Case(
        program_end_date=date.fromisoformat(raw["program_end_date"]),
        degree_level=raw["degree_level"],
        documents_count=_finite(raw["documents_count"], "documents_count"),
        cpt_full_time_days=_finite(raw.get(CPT_DAYS), CPT_DAYS),
        opt=_ead_block(raw.get("opt")),
        stem=_ead_block(raw.get("stem")),
        employment=tuple(
            EmploymentPeriod(
                start=date.fromisoformat(p["start"]),
                end=_date(p["end"]),
                hours_per_week=_finite(p["hours_per_week"], f"employment_{number}_hours_per_week"),
                employer_reported=p["employer_reported"],
            )
            for number, p in enumerate(raw["employment"], start=1)
        ),
        cap_gap=None
        if cap_gap is None
        else CapGap(
            petition_filed_on=date.fromisoformat(cap_gap["petition_filed_on"]),
            requested_start=date.fromisoformat(cap_gap["requested_start"]),
            change_of_status=cap_gap["change_of_status"],
            status=cap_gap["status"],
        ),
        time_zone=raw["time_zone"],
        confirmations=_confirmations(raw, clock),
    )


def _shown(value: Any) -> Any:
    return value.isoformat() if isinstance(value, date) else value


def _whole(values: Values, rule_id: str) -> int:
    value = values[rule_id]
    if isinstance(value, bool) or not isinstance(value, int):
        raise RulepackError(f"{rule_id}: the engine needs a whole number, the pack gives {value!r}")
    return value


def _number(values: Values, rule_id: str) -> float:
    value = values[rule_id]
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise RulepackError(f"{rule_id}: the engine needs a number, the pack gives {value!r}")
    return value


def _month_day(values: Values, rule_id: str) -> tuple[int, int]:
    value = values[rule_id]
    try:
        month, day = (int(part) for part in str(value).split("-"))
    except ValueError:
        raise RulepackError(
            f"{rule_id}: the engine needs a month and day, the pack gives {value!r}"
        ) from None
    return month, day


class _Working:
    """Collects the computed items, the rules they used, and the inputs found missing."""

    def __init__(self, pack: Rulepack, today: date, settings: Mapping[str, Any]) -> None:
        self.pack = pack
        self.today = today
        self.settings = settings
        self.computed: list[dict[str, Any]] = []
        self.dated: dict[str, date] = {}
        self.numbers: dict[str, int] = {}
        self.rules: dict[str, dict[str, Any]] = {}
        self.missing: list[str] = []
        # Inputs a question covers. Until the person answers, Duly does not say they
        # are missing: that would be a guess that the part exists.
        self.silent: set[str] = set()
        # Inputs held in a conflict that is open. An item that uses one has no value.
        self.conflicted: set[str] = set()
        # Items whose step is recorded as done: no open item, nothing ahead.
        self.done: set[str] = set()
        self.ahead: list[dict[str, Any]] = []
        # The STEM report items: a date of one that has passed is asked about (point 21).
        self.reports: list[str] = []

    def name_missing(self, name: str) -> None:
        if name not in self.missing and name not in self.silent:
            self.missing.append(name)

    def setting(self, setting_id: str) -> int:
        return whole_setting(self.settings, setting_id)

    def whole_rule(self, rule_id: str) -> int:
        """The operative value of a rule that decides which items there are."""
        return _whole({rule_id: self._rule(rule_id)["value"]}, rule_id)

    def value_of(self, rule_id: str) -> Any:
        """The operative value of a rule in force today."""
        return self._rule(rule_id)["value"]

    def holds(self, rule_id: str) -> bool:
        """Whether the pack has the rule in force today."""
        return self.pack.value(rule_id, self.today) is not None

    def _operative(self, parameters: list[dict[str, Any]]) -> dict[str, Any]:
        """The regime whose value the item shows, with its legal status from the pack."""
        named = {p["regime"] for p in parameters if "regime" in p}
        held = [
            regime
            for regime in self.pack.regimes
            if regime["operative"] and (not named or regime["id"] in named)
        ]
        if len(held) != 1:
            rules = ", ".join(p["id"] for p in parameters)
            raise RulepackError(f"{rules}: the engine needs one operative regime for the value")
        return {"regime": held[0]["id"], "legal_status": held[0]["legal_status"]}

    def _rule(self, rule_id: str) -> dict[str, Any]:
        found = self.pack.value(rule_id, self.today)
        if found is None:
            raise RulepackError(f"{rule_id}: no rule in force on {self.today.isoformat()}")
        return found

    def show(self, rule_id: str) -> None:
        """A rule whose words the screen shows beside a judgement for the DSO."""
        self._show_rule(self._rule(rule_id))

    def _show_rule(self, parameter: dict[str, Any]) -> None:
        source = parameter["source"]
        shown = {
            "value": parameter["value"],
            "unit": parameter["unit"],
            "status": parameter["status"],
            "citation": source["citation"],
            "url": source["url"],
            "checked_on": source["checked_on"],
        }
        if "quote" in source:
            shown["quote"] = source["quote"]
        if "regime" in parameter:
            shown["regime"] = parameter["regime"]
        # Verbatim or a reading, as the pack has it. A reading carries its note.
        if "derivation" in parameter:
            shown["derivation"] = parameter["derivation"]
        if parameter.get("derivation") == "reading" and "note" in parameter:
            shown["note"] = parameter["note"]
        self.rules[parameter["id"]] = shown

    def _alternates(
        self, rule_ids: tuple[str, ...], formula: Callable[[Values], Value], value: Value
    ) -> list[dict[str, Any]]:
        """The value under each regime that is not operative and holds one of the rules.
        An item dated before a regime's own row took effect carries no alternate for that
        regime (SPEC-resolutions point 23): such a rule does not reach back."""
        found = []
        for regime in self.pack.regimes:
            if regime["operative"]:
                continue
            under = {r: self.pack.value(r, self.today, regime=regime["id"]) for r in rule_ids}
            if any(p is None for p in under.values()):
                continue
            own = [p for p in under.values() if p is not None and p.get("regime") == regime["id"]]
            if not own:
                continue
            if isinstance(value, date) and any(
                value.isoformat() < p["effective_from"] for p in own
            ):
                continue
            values = {r: p["value"] for r, p in under.items() if p is not None}
            found.append(
                {
                    "regime": regime["id"],
                    "legal_status": regime["legal_status"],
                    "value": _shown(formula(values)),
                }
            )
        return found

    def add(
        self,
        item_id: str,
        unit: str,
        inputs: dict[str, Any],
        rule_ids: tuple[str, ...],
        formula: Callable[[Values], Value],
        needs: tuple[str, ...] = (),
        settings: tuple[str, ...] = (),
        reading: bool = False,
    ) -> None:
        """One computed item. needs names the inputs the formula cannot do without: if
        one is missing the value is null and the input is named, never guessed. settings
        names Duly's own choices that were used on the item's inputs. An item that uses
        an input held in an open conflict has the value null. reading marks an item whose
        inputs Duly reads as more than they state."""
        item, value = self._item(item_id, unit, inputs, rule_ids, formula, needs, settings)
        item["reading"] = item["reading"] or reading
        self.computed.append(item)
        if isinstance(value, date):
            self.dated[item_id] = value
            if value > self.today and item_id not in self.done:
                self.ahead.append(_ahead(item, item_id))
        elif value is not None:
            self.numbers[item_id] = value

    def add_ahead(
        self,
        entry_id: str,
        inputs: dict[str, Any],
        rule_ids: tuple[str, ...],
        formula: Callable[[Values], Value],
    ) -> None:
        """A date of the step that the rules place next. It is a date ahead and is not
        among the computed items. A pack that lacks one of the rules gives no date."""
        if not all(self.holds(rule_id) for rule_id in rule_ids):
            return
        item, value = self._item(entry_id, "date", inputs, rule_ids, formula, tuple(inputs), ())
        if isinstance(value, date) and value > self.today:
            self.ahead.append(_ahead(item, entry_id))

    def _item(
        self,
        item_id: str,
        unit: str,
        inputs: dict[str, Any],
        rule_ids: tuple[str, ...],
        formula: Callable[[Values], Value],
        needs: tuple[str, ...],
        settings: tuple[str, ...],
    ) -> tuple[dict[str, Any], Value]:
        parameters = [self._rule(rule_id) for rule_id in rule_ids]
        for parameter in parameters:
            self._show_rule(parameter)
        absent = [name for name in needs if inputs[name] is None]
        for name in absent:
            self.name_missing(name)
        unsure = any(name in self.conflicted for name in inputs)

        def guarded(values: Values) -> Value:
            return None if absent or unsure else formula(values)

        value = guarded({p["id"]: p["value"] for p in parameters})
        item: dict[str, Any] = {
            "id": item_id,
            "value": _shown(value),
            "unit": unit,
            "inputs": {name: _shown(entered) for name, entered in inputs.items()},
            "rule_ids": list(rule_ids),
            "status": max((p["status"] for p in parameters), key=STATUS_ORDER.index),
            "reading": any(p.get("derivation") == "reading" for p in parameters),
        }
        # The look-ahead decides whether a dated item of this kind is an open item.
        if isinstance(value, date) and _open_kind(item_id):
            settings = (*settings, LOOKAHEAD)
        if settings:
            item["inputs"]["duly_settings"] = list(settings)
        alternates = self._alternates(rule_ids, guarded, value)
        if alternates:
            item["alternates"] = alternates
            item["operative"] = self._operative(parameters)
        return item, value


def _open_kind(item_id: str) -> bool:
    return item_id.endswith(OPEN_ITEM_ENDINGS) or item_id.startswith(OPEN_ITEM_PREFIXES)


def _days_after(day: date, rule_id: str) -> Callable[[Values], Value]:
    return lambda v: day + timedelta(days=_whole(v, rule_id))


def _ahead(item: dict[str, Any], entry_id: str) -> dict[str, Any]:
    """An entry of upcoming: the date, its rules, and nothing more."""
    entry = {
        "id": entry_id,
        "date": item["value"],
        "rule_ids": item["rule_ids"],
        "status": item["status"],
        "reading": item["reading"],
    }
    for name in ("alternates", "operative"):
        if name in item:
            entry[name] = item[name]
    return entry


Piece = tuple[date, int, float | None]


def _pieces(case: F1Case, opt: EadBlock, today: date) -> list[Piece] | None:
    """The counting window cut into pieces within which nothing changes: the first day
    of the piece, its length in days, and the most hours among the periods that cover
    it, None when no period does. None when the window cannot be known.

    The work grows with the number of periods, never with the length of the window."""
    blocks = [opt] if case.stem is None else [opt, case.stem]
    cards = [
        (block.ead_start, block.ead_end)
        for block in blocks
        if block.ead_start is not None and block.ead_end is not None
    ]
    if len(cards) < len(blocks):
        return None
    periods = [
        (p.start, today if p.end is None else p.end, p.hours_per_week) for p in case.employment
    ]
    found: list[Piece] = []
    # Days between two cards are outside the window: never employed, never unemployed.
    for first, card_end in cards:
        last = min(today, card_end)
        if last < first:
            continue
        cuts = {first, last + ONE_DAY}
        for start, end, _ in periods:
            if first < start <= last:
                cuts.add(start)
            if first <= end < last:
                cuts.add(end + ONE_DAY)
        for begin, after in pairwise(sorted(cuts)):
            hours = [h for start, end, h in periods if start <= begin <= end]
            found.append((begin, (after - begin).days, max(hours, default=None)))
    return found


def _employment_shown(case: F1Case) -> list[dict[str, Any]]:
    return [
        {
            "start": p.start.isoformat(),
            "end": _shown(p.end),
            "hours_per_week": p.hours_per_week,
            "employer_reported": p.employer_reported,
        }
        for p in case.employment
    ]


def _add_program_items(work: _Working, case: F1Case) -> None:
    end = case.program_end_date
    inputs = {"program_end_date": end}
    work.add(
        "opt.apply_window_opens",
        "date",
        inputs,
        ("opt.apply_before_days",),
        lambda v: end - timedelta(days=_whole(v, "opt.apply_before_days")),
    )

    def days_after(rule_id: str) -> Callable[[Values], Value]:
        return lambda v: end + timedelta(days=_whole(v, rule_id))

    # The filing window and the start date each have a paragraph of their own.
    for item_id, rule_id in (
        ("opt.apply_window_closes", "opt.apply_after_days"),
        ("opt.latest_start", "opt.latest_start_after_days"),
    ):
        work.add(item_id, "date", inputs, (rule_id,), days_after(rule_id))
    work.add(
        "opt.complete_by",
        "date",
        inputs,
        ("opt.complete_within_months",),
        lambda v: add_months(end, _whole(v, "opt.complete_within_months")),
    )


def _add_file_by(work: _Working, part: str, block: EadBlock) -> None:
    name = f"{part}.dso_recommendation_date"
    rule_id = f"{part}.file_within_days_of_recommendation"
    recommended = block.dso_recommendation_date
    # D32: once a filing or an EAD is recorded, an absent recommendation date has
    # stopped mattering. The item is left out and nothing is said about it.
    later = block.i765_filed_date is not None or block.ead_start is not None
    if recommended is None and later:
        return
    work.add(
        f"{part}.file_by",
        "date",
        {name: recommended},
        (rule_id,),
        lambda v: None if recommended is None else recommended + timedelta(days=_whole(v, rule_id)),
        needs=(name,),
    )


def _add_counts(
    work: _Working,
    case: F1Case,
    opt: EadBlock | None,
    conflicts: tuple[str, ...],
    listed: bool,
) -> None:
    """opt is the block entered, or the block the person confirmed and has not entered.
    listed says whether the employment entered can be taken as the whole list."""
    today = work.today
    stem = case.stem
    stem_start = None if stem is None else stem.ead_start
    on_stem = stem_start is not None and today >= stem_start
    limit_rule = "stem.unemployment_limit_days" if on_stem else "opt.unemployment_limit_days"
    hours_rules: tuple[str, ...] = ("opt.min_hours_per_week",)
    # Without the OPT block the window has no first day, and the block itself is named.
    window: dict[str, Any] = (
        {"opt": None}
        if opt is None
        else {"opt.ead_start": opt.ead_start, "opt.ead_end": opt.ead_end}
    )
    if stem is not None:
        hours_rules = (*hours_rules, "stem.min_hours_per_week")
        window |= {"stem.ead_start": stem.ead_start, "stem.ead_end": stem.ead_end}
    counting_inputs = {**window, "today": today, "employment": _employment_shown(case)}

    # Dates that conflict give no window to count in. The conflict is in the verdict.
    # Neither does a list of employment the person has not confirmed as whole.
    pieces = None if opt is None or conflicts or not listed else _pieces(case, opt, today)

    # Days used do not turn on the hours rules: a day is used when no period covers it.
    used = None if pieces is None else sum(days for _, days, hours in pieces if hours is None)

    def under_hours(v: Values) -> int | None:
        if pieces is None:
            return None
        opt_min = _number(v, "opt.min_hours_per_week")
        stem_min = _number(v, "stem.min_hours_per_week") if stem is not None else opt_min
        return sum(
            days
            for begin, days, hours in pieces
            if hours is not None
            and hours < (stem_min if stem_start is not None and begin >= stem_start else opt_min)
        )

    work.add(
        "unemployment.limit",
        "days",
        {"stem.ead_start": stem_start, "today": today},
        (limit_rule,),
        lambda v: _whole(v, limit_rule),
    )
    # opt.ead_start is checked against the earliest start Duly takes as entered right.
    checked = (OPT_START_LOOKBACK,)
    # On the STEM card the days used still hold the days of the OPT card, so the item
    # names the rule of each card it counted in.
    counted: tuple[str, ...] = (limit_rule,)
    if on_stem:
        counted = (limit_rule, "opt.unemployment_limit_days")
    work.add(
        "unemployment.days_used",
        "days",
        counting_inputs,
        counted,
        lambda v: used,
        needs=tuple(window),
        settings=checked,
    )
    work.add(
        "unemployment.days_remaining",
        "days",
        counting_inputs,
        (limit_rule,),
        lambda v: None if used is None else _whole(v, limit_rule) - used,
        needs=tuple(window),
        settings=checked,
    )
    if stem is not None and opt is not None:
        # SPEC-resolutions point 19: the days of the OPT card stay held to its own limit.
        card_end = opt.ead_end
        opt_rule = "opt.unemployment_limit_days"
        card_used = (
            None
            if pieces is None or card_end is None
            else sum(days for begin, days, hours in pieces if hours is None and begin <= card_end)
        )
        work.add(
            "unemployment.opt_card_days_used",
            "days",
            {
                "opt.ead_start": opt.ead_start,
                "opt.ead_end": card_end,
                "today": today,
                "employment": _employment_shown(case),
            },
            (opt_rule,),
            lambda v: card_used,
            needs=("opt.ead_start", "opt.ead_end"),
            settings=checked,
        )
    work.add(
        "employment.days_under_hours",
        "days",
        counting_inputs,
        hours_rules,
        under_hours,
        needs=tuple(window),
        settings=checked,
    )
    work.add(
        "employment.periods_not_reported",
        "count",
        {"employment": _employment_shown(case)},
        (REPORT_EMPLOYER,),
        lambda v: sum(1 for p in case.employment if not p.employer_reported) if listed else None,
    )


def _final_end(case: F1Case) -> tuple[date, dict[str, Any]]:
    inputs: dict[str, Any] = {"program_end_date": case.program_end_date}
    if case.opt is not None:
        inputs["opt.ead_end"] = case.opt.ead_end
    if case.stem is not None:
        inputs["stem.ead_end"] = case.stem.ead_end
    return max(day for day in inputs.values() if day is not None), inputs


def _validation_reports(work: _Working, extension: str, interval: str) -> Iterator[int]:
    """The number of each validation report: one for each whole interval in the
    extension. The count is derived from the two rules and written nowhere."""
    months = work.whole_rule(interval)
    if months <= 0:
        raise RulepackError(f"{interval}: the engine needs a number over zero")
    return iter(range(1, work.whole_rule(extension) // months + 1))


def _add_stem_items(work: _Working, opt: EadBlock | None, stem: EadBlock) -> None:
    # The window is set by the end of OPT. Without the OPT block the block is named.
    opt_end = None if opt is None else opt.ead_end
    needed = "opt" if opt is None else "opt.ead_end"
    before = "stem.apply_before_expiry_days"
    work.add(
        "stem.apply_window_opens",
        "date",
        {needed: opt_end},
        (before,),
        lambda v: None if opt_end is None else opt_end - timedelta(days=_whole(v, before)),
        needs=(needed,),
    )
    # A pack whose source does not state the closing leaves the rule out, and the item
    # is left out with it.
    if work.holds(STEM_WINDOW_CLOSES):
        work.add(
            "stem.apply_window_closes",
            "date",
            {needed: opt_end},
            (STEM_WINDOW_CLOSES,),
            lambda v: opt_end,
            needs=(needed,),
        )
    _add_file_by(work, "stem", stem)

    start = stem.ead_start
    end = stem.ead_end
    extension = "stem.extension_months"
    interval = "stem.validation_interval_months"
    within = "stem.validation_due_business_days"
    every = "stem.evaluation_interval_months"
    due = "stem.evaluation_due_days"

    def validation_due(report: int) -> Callable[[Values], Value]:
        def formula(v: Values) -> Value:
            if start is None:
                return None
            reached = add_months(start, _whole(v, interval) * report)
            return add_business_days(reached, _whole(v, within))

        return formula

    for report in _validation_reports(work, extension, interval):
        work.reports.append(f"stem.validation_{report}_due")
        work.add(
            f"stem.validation_{report}_due",
            "date",
            {"stem.ead_start": start},
            (interval, within, extension, HOLIDAYS_LAW),
            validation_due(report),
            needs=("stem.ead_start",),
        )
    work.reports.extend(("stem.evaluation_12_month_due", "stem.final_evaluation_due_from_ead_end"))
    work.add(
        "stem.evaluation_12_month_due",
        "date",
        {"stem.ead_start": start},
        (every, due),
        lambda v: (
            None
            if start is None
            else add_months(start, _whole(v, every)) + timedelta(days=_whole(v, due))
        ),
        needs=("stem.ead_start",),
    )
    work.add(
        "stem.final_evaluation_due_from_ead_end",
        "date",
        {"stem.ead_end": end},
        (due,),
        lambda v: None if end is None else end + timedelta(days=_whole(v, due)),
        needs=("stem.ead_end",),
    )


Ask = Callable[[str, bool, dict[str, Any]], str]


def _stem_card(work: _Working, stem: EadBlock | None) -> tuple[date, date] | None:
    """The STEM card, when both its dates are entered and neither is held in a conflict."""
    if stem is None or stem.ead_start is None or stem.ead_end is None:
        return None
    if {"stem.ead_start", "stem.ead_end"} & work.conflicted:
        return None
    return stem.ead_start, stem.ead_end


def _add_periods(work: _Working, case: F1Case, ask: Ask) -> bool:
    """SPEC-resolutions points 20 and 22, for each employment period, numbered as the
    case lists them. Returns whether the end of a period is still to be reported."""
    card = _stem_card(work, case.stem)
    owed = False
    for number, period in enumerate(case.employment, start=1):
        start, end = period.start, period.end
        if end is not None and end < start:
            continue
        begun = f"employment.{number}.start"
        if card is not None and card[0] <= start <= card[1]:
            about = {begun: start.isoformat(), "stem.ead_start": card[0].isoformat()}
            if ask(f"employment.{number}.new_employer", True, about) == YES:
                work.add(
                    f"stem.new_plan_due.{number}",
                    "date",
                    {begun: start, "stem.ead_start": card[0], "stem.ead_end": card[1]},
                    (NEW_PLAN,),
                    _days_after(start, NEW_PLAN),
                )
        if end is None:
            continue
        ended = f"employment.{number}.end"
        if card is not None and card[0] <= end < card[1]:
            # Taking the period's end as the conclusion of the opportunity is a reading.
            concluding = f"stem.concluding_evaluation_due.{number}"
            work.reports.append(concluding)
            work.add(
                concluding,
                "date",
                {ended: end, "stem.ead_start": card[0], "stem.ead_end": card[1]},
                (EVALUATION_DUE,),
                _days_after(end, EVALUATION_DUE),
                reading=True,
            )
        about = {begun: start.isoformat(), ended: end.isoformat()}
        if ask(f"employment.{number}.end_reported", True, about) == NO:
            # The regulation states the duty and no days; the days are SEVP's guidance.
            rules: tuple[str, ...] = (REPORT_EMPLOYER,)
            if work.holds(REPORT_INTERRUPTION):
                rules = (*rules, REPORT_INTERRUPTION)
            work.add(
                f"employment.{number}.end_report_by",
                "date",
                {ended: end},
                rules,
                _days_after(end, REPORT_EMPLOYER),
            )
            owed = True
    return owed


def _passed_reports(work: _Working, ask: Ask) -> tuple[str, ...]:
    """SPEC-resolutions point 21: a STEM report whose date has passed does not drop out.
    Returns the judgement items of the reports the person says were not made."""
    not_made = []
    for item_id in work.reports:
        day = work.dated.get(item_id)
        if day is None or day >= work.today:
            continue
        made = ask(f"{item_id}.made", True, {item_id: day.isoformat()})
        if made == YES:
            work.done.add(item_id)
        elif made == NO:
            not_made.append(f"{item_id}.not_made")
    if not_made and work.holds(STEM_REPORTING):
        work.show(STEM_REPORTING)
    return tuple(not_made)


def _cap_gap_active(cap_gap: CapGap) -> bool:
    return cap_gap.status in CAP_GAP_ACTIVE and cap_gap.change_of_status


def _cap_gap_ends(cap_gap: CapGap) -> Callable[[Values], Value]:
    requested = cap_gap.requested_start
    active = _cap_gap_active(cap_gap)

    def formula(v: Values) -> Value:
        if not active:
            return None
        month, day = _month_day(v, "capgap.end_month_day")
        # A start on or after the first day of the fiscal year is in the fiscal year
        # whose end date falls in the next calendar year.
        later = (requested.month, requested.day) >= _month_day(v, FISCAL_YEAR_START)
        return min(requested, date(requested.year + (1 if later else 0), month, day))

    return formula


CAP_GAP_RULES = ("capgap.end_month_day", FISCAL_YEAR_START)


def _cap_gap_inputs(cap_gap: CapGap) -> dict[str, Any]:
    return {
        "cap_gap.requested_start": cap_gap.requested_start,
        "cap_gap.status": cap_gap.status,
        "cap_gap.change_of_status": cap_gap.change_of_status,
    }


def _add_cap_gap(work: _Working, cap_gap: CapGap) -> None:
    work.add(
        "capgap.ends",
        "date",
        _cap_gap_inputs(cap_gap),
        CAP_GAP_RULES,
        _cap_gap_ends(cap_gap),
    )


def _cap_gap_past_cards(work: _Working, case: F1Case) -> bool:
    """SPEC-resolutions point 18: an active cap-gap petition whose end is after the last
    card end, or whose end cannot be known while its dates are in a conflict."""
    gap = case.cap_gap
    if gap is None or not _cap_gap_active(gap):
        return False
    card_ends = [block.ead_end for block in (case.opt, case.stem) if block and block.ead_end]
    if not card_ends:
        return False
    if any(name in work.conflicted for name in _cap_gap_inputs(gap)):
        return True
    ends = _cap_gap_ends(gap)({r: work.value_of(r) for r in CAP_GAP_RULES})
    return isinstance(ends, date) and ends > max(card_ends)


def _answer(
    case: F1Case,
    question: str,
    raised: bool,
    about: Mapping[str, Any],
    through: date | None = None,
) -> str:
    """Where a question stands. An answer to a question that is not raised is not read.

    An answer holds for the values it was given for: one that carries other values, or
    none, is not an answer to this question (SPEC-resolutions point 7). through is the
    last day a yes has to cover: a yes given before it leaves the days since open."""
    if not raised:
        return NOT_RAISED
    given = case.confirmations.get(question)
    if given is None:
        return OPEN
    if given.about is None or dict(given.about) != dict(about):
        return OPEN
    if given.answer and through is not None and given.on < through:
        return OPEN
    return YES if given.answer else NO


@dataclass(frozen=True)
class Fact:
    """Facts entered that do not fit: the id of the row, and the values, by input."""

    id: str
    about: dict[str, Any]


def _has_days_outside(first: date, final: date, cards: list[tuple[date, date]]) -> bool:
    """Whether a day from first through final lies outside every card."""
    day = first
    for begin, finish in sorted(cards):
        if day > final or begin > day:
            break
        if finish >= day:
            day = finish + ONE_DAY
    return day <= final


def _facts(case: F1Case, work: _Working) -> list[Fact]:
    """specs/product-1/SPEC.md, section 1, in the order of the table. The engine says
    that the facts do not fit. It never says which one is wrong, or what they mean."""
    today = work.today
    found: list[Fact] = []
    blocks = [(part, block) for part, block in (("opt", case.opt), ("stem", case.stem)) if block]
    gap = case.cap_gap

    def note(fact_id: str, about: dict[str, Any]) -> None:
        found.append(Fact(fact_id, {name: _shown(value) for name, value in about.items()}))

    for name in ("i765_filed_date", "dso_recommendation_date"):
        for part, block in blocks:
            entered = getattr(block, name)
            if entered is not None and entered > today:
                note(f"{part}.{name}.after_today", {f"{part}.{name}": entered})
    if gap is not None and gap.petition_filed_on > today:
        note(
            "cap_gap.petition_filed_on.after_today",
            {"cap_gap.petition_filed_on": gap.petition_filed_on},
        )
    for part, block in blocks:
        filed, start = block.i765_filed_date, block.ead_start
        if filed is not None and start is not None and filed > start:
            note(
                f"{part}.i765_filed_date.after_card",
                {f"{part}.i765_filed_date": filed, f"{part}.ead_start": start},
            )
    cards = {
        part: (block.ead_start, block.ead_end)
        for part, block in blocks
        if block.ead_start is not None and block.ead_end is not None
    }
    shown_cards: dict[str, Any] = {}
    for part, (start, end) in cards.items():
        shown_cards |= {f"{part}.ead_start": start, f"{part}.ead_end": end}
    if gap is not None:
        if gap.petition_filed_on > gap.requested_start:
            note(
                "cap_gap.petition_filed_on.after_start",
                {
                    "cap_gap.petition_filed_on": gap.petition_filed_on,
                    "cap_gap.requested_start": gap.requested_start,
                },
            )
        if cards:
            first_part = min(cards, key=lambda part: cards[part][0])
            if gap.requested_start < cards[first_part][0]:
                note(
                    "cap_gap.requested_start.before_training",
                    {
                        "cap_gap.requested_start": gap.requested_start,
                        f"{first_part}.ead_start": cards[first_part][0],
                    },
                )
    for part, (start, end) in cards.items():
        rule_id = CARD_MONTHS[part]
        # A pack without the rule gives no length to hold the card against.
        if work.holds(rule_id) and end > add_months(start, work.whole_rule(rule_id)):
            work.show(rule_id)
            note(
                f"{part}.card_longer_than_rule",
                {f"{part}.ead_start": start, f"{part}.ead_end": end},
            )
    if "opt" in cards and "stem" in cards and cards["stem"][0] > cards["opt"][1] + ONE_DAY:
        note(
            "stem.gap_after_opt",
            {"opt.ead_end": cards["opt"][1], "stem.ead_start": cards["stem"][0]},
        )
    if cards:
        last_end = max(end for _, end in cards.values())
        outside = []
        for period in case.employment:
            # An open period runs through today. Its days after the last card are left.
            final = min(today, last_end) if period.end is None else period.end
            if _has_days_outside(period.start, final, list(cards.values())):
                outside.append({"start": period.start.isoformat(), "end": _shown(period.end)})
        if outside:
            note("employment.period_outside_cards", {"employment": outside, **shown_cards})
    found.extend(_window_facts(case, work))
    return found


def _window_facts(case: F1Case, work: _Working) -> list[Fact]:
    """SPEC-resolutions points 11, 14, 15 and 16: a date entered against the window the
    regulation gives it. Each day count is the rule's value in the pack. Each row names
    its rule and says nothing of what the dates mean."""
    found: list[Fact] = []

    def note(fact_id: str, rule_id: str, about: dict[str, date]) -> None:
        work.show(rule_id)
        found.append(Fact(fact_id, {name: _shown(value) for name, value in about.items()}))

    for part, block in (("opt", case.opt), ("stem", case.stem)):
        if block is None:
            continue
        recommended, filed = block.dso_recommendation_date, block.i765_filed_date
        rule_id = f"{part}.file_within_days_of_recommendation"
        if recommended is None or filed is None or not work.holds(rule_id):
            continue
        about = {f"{part}.dso_recommendation_date": recommended, f"{part}.i765_filed_date": filed}
        if filed < recommended:
            note(f"{part}.i765_filed_date.before_recommendation", rule_id, about)
        elif filed > recommended + timedelta(days=work.whole_rule(rule_id)):
            note(f"{part}.i765_filed_date.after_file_by", rule_id, about)

    opt, stem = case.opt, case.stem
    before = "stem.apply_before_expiry_days"
    if (
        opt is not None
        and stem is not None
        and opt.ead_end is not None
        and stem.i765_filed_date is not None
        and work.holds(before)
        and stem.i765_filed_date < opt.ead_end - timedelta(days=work.whole_rule(before))
    ):
        note(
            "stem.i765_filed_date.before_window_opens",
            before,
            {"opt.ead_end": opt.ead_end, "stem.i765_filed_date": stem.i765_filed_date},
        )
    if opt is None:
        return found
    end = case.program_end_date
    # The operative value only; the other regime's value stays on the window items.
    after = "opt.apply_after_days"
    filed = opt.i765_filed_date
    if (
        filed is not None
        and work.holds(after)
        and filed > end + timedelta(days=work.whole_rule(after))
    ):
        note(
            "opt.i765_filed_date.after_window_closes",
            after,
            {"program_end_date": end, "opt.i765_filed_date": filed},
        )
    # Taking the card end as the end of training is Duly's reading; the rule shown
    # beside the question carries the pack's derivation.
    within = "opt.complete_within_months"
    card_end = opt.ead_end
    if (
        card_end is not None
        and work.holds(within)
        and card_end > add_months(end, work.whole_rule(within))
    ):
        note(
            "opt.ead_end.after_complete_by",
            within,
            {"program_end_date": end, "opt.ead_end": card_end},
        )
    return found


def _missing_ead_dates(work: _Working, opt: EadBlock | None, stem: EadBlock | None) -> None:
    for part, block in (("opt", opt), ("stem", stem)):
        if block is None:
            continue
        if block.ead_start is None:
            work.name_missing(f"{part}.ead_start")
        if block.ead_end is None:
            work.name_missing(f"{part}.ead_end")


def _conflicts(case: F1Case, earliest_years: int) -> tuple[str, ...]:
    found = []
    opt, stem = case.opt, case.stem
    for part, block in (("opt", opt), ("stem", stem)):
        if block is None or block.ead_start is None or block.ead_end is None:
            continue
        if block.ead_end < block.ead_start:
            found.append(f"{part}_end")
    for number, period in enumerate(case.employment, start=1):
        if period.end is not None and period.end < period.start:
            found.append(f"employment_{number}_end")
    if opt is not None and opt.ead_start is not None:
        earliest = add_years(case.program_end_date, -earliest_years)
        if opt.ead_start < earliest:
            found.append("opt_start")
    if (
        opt is not None
        and stem is not None
        and stem.ead_start is not None
        and opt.ead_end is not None
        and stem.ead_start <= opt.ead_end
    ):
        found.append("stem_start")
    return tuple(found)


def _judgement_items(work: _Working, case: F1Case, cpt_days: int | None) -> tuple[str, ...]:
    found = []
    if work.numbers.get("employment.days_under_hours", 0) > 0:
        found.append("hours_under_threshold")
    remaining = work.numbers.get("unemployment.days_remaining")
    if remaining is not None and remaining <= 0:
        found.append("unemployment_at_or_over_limit")
    if cpt_days is not None and cpt_days >= work.whole_rule(CPT_BAR):
        found.append("cpt_full_time_at_or_over_bar")
    if case.cap_gap is not None and "capgap.ends" not in work.dated:
        found.append("cap_gap_petition_not_active")
    stem = case.stem
    card_used = work.numbers.get("unemployment.opt_card_days_used")
    if (
        stem is not None
        and stem.ead_start is not None
        and stem.ead_end is not None
        and card_used is not None
        and card_used >= work.whole_rule("opt.unemployment_limit_days")
    ):
        found.append("unemployment_opt_card_at_or_over_limit")
    return tuple(found)


def _open_items(work: _Working, end_owed: bool) -> tuple[str, ...]:
    found = []
    if end_owed or work.numbers.get("employment.periods_not_reported", 0) > 0:
        found.append("report_employer")
    horizon = work.today + timedelta(days=work.setting(LOOKAHEAD))
    for item_id, day in work.dated.items():
        if item_id in work.done:
            continue
        if _open_kind(item_id) and work.today <= day <= horizon:
            found.append(item_id)
    return tuple(found)


def _add_next_step(work: _Working, opt: EadBlock) -> None:
    """specs/product-1/SPEC.md, section 6: with OPT entered and no STEM entered, the
    dates of the step that the rules place next, from the OPT card. These are dates and
    nothing more. The grace date is grace.ends, listed once (SPEC-resolutions point 12)."""
    card_end = opt.ead_end
    inputs = {"opt.ead_end": card_end}
    before = "stem.apply_before_expiry_days"
    work.add_ahead(
        "next.stem.apply_window_opens",
        inputs,
        (before,),
        lambda v: None if card_end is None else card_end - timedelta(days=_whole(v, before)),
    )
    work.add_ahead(
        "next.stem.apply_window_closes", inputs, (STEM_WINDOW_CLOSES,), lambda v: card_end
    )
    work.add_ahead("next.opt.card_ends", inputs, (CARD_MONTHS["opt"],), lambda v: card_end)


def _lists(work: _Working) -> list[dict[str, Any]]:
    """What the regulation lists for the 24-month extension: the rules the pack holds
    for it, in the order of the pack. The engine adds none and says nothing of whether
    any of them is met."""
    listed: list[str] = []
    for parameter in work.pack.parameters:
        rule_id = parameter["id"]
        if rule_id.startswith(LISTED_PREFIX) and rule_id not in listed and work.holds(rule_id):
            work.show(rule_id)
            listed.append(rule_id)
    return [{"id": STEM_LIST, "rule_ids": listed}] if listed else []


def compute_f1(
    case: F1Case, pack: Rulepack, clock: Clock, *, settings: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Every F-1 date and count for the case, in the shape of the engine output contract.

    settings holds Duly's own choices in the shape of contracts/product_settings.yaml
    once parsed. None means the shipped file.
    """
    today = day_in_zone(clock, case.time_zone)
    work = _Working(pack, today, load_settings() if settings is None else settings)

    conflicts = _conflicts(case, work.setting(OPT_START_LOOKBACK))

    questions: list[dict[str, Any]] = []

    def ask(question: str, raised: bool, about: dict[str, Any], through: date | None = None) -> str:
        stands = _answer(case, question, raised, about, through)
        if stands == OPEN:
            questions.append({"id": question, "because": list(about), "about": about})
        return stands

    # Confirm, never assume. Each gap the person can close with a plain answer.
    no_training = case.opt is None and case.stem is None
    held = ask(HELD_OPT, case.stem is not None and case.opt is None, {"stem": True, "opt": None})
    begun = case.opt is not None and case.opt.ead_start is not None and today >= case.opt.ead_start
    started = None if case.opt is None else _shown(case.opt.ead_start)
    empty = ask(
        NO_EMPLOYMENT,
        begun and not case.employment,
        {"employment": [], "opt.ead_start": started},
        through=today,
    )
    alone = ask(
        CAP_GAP_ALONE,
        case.cap_gap is not None and no_training,
        {"cap_gap": True, "opt": None, "stem": None},
    )
    nothing = ask(
        NOTHING_MORE,
        no_training and case.cap_gap is None,
        {"opt": None, "stem": None, "cap_gap": None},
    )
    cpt = ask(CPT_USED, case.cpt_full_time_days is None, {CPT_DAYS: None})
    unconfirmed = tuple(question["id"] for question in questions)

    # Facts that do not fit. With the answer yes the dates stand as entered and the
    # matter is one for the DSO. Until then the inputs in it give no value.
    confirmed: list[str] = []
    unsettled: list[str] = []
    for fact in _facts(case, work):
        stands = ask(fact.id, True, fact.about)
        if stands == YES:
            confirmed.append(fact.id)
            continue
        unsettled.append(fact.id)
        work.conflicted.update(fact.about)

    for part, block in (("opt", case.opt), ("stem", case.stem)):
        if block is not None and (block.i765_filed_date is not None or block.ead_start is not None):
            work.done.update(STEPS[part])

    # With the answer yes the OPT block is one the person holds and has not entered.
    opt = NOT_ENTERED if case.opt is None and YES in (held, alone) else case.opt
    if OPEN in (held, alone) or NO in (held, alone):
        work.silent.add("opt")
    if alone == YES:
        # SPEC-context, section 4: this answer names the end of OPT, and no other date.
        work.silent.add("opt.ead_start")
    listed = empty in (NOT_RAISED, YES)
    if empty == NO:
        work.name_missing("employment")
    if nothing == NO:
        work.name_missing("training")

    _add_program_items(work, case)
    if case.opt is not None:
        _add_file_by(work, "opt", case.opt)
    # The counts are wanted as soon as anything about work after the program is entered.
    if case.opt is not None or case.stem is not None or case.cap_gap is not None or case.employment:
        _add_counts(work, case, opt, conflicts, listed)
    final_end, ends = _final_end(case)
    # Cap-gap alone, until the person says there was no training: the last end date may
    # be the end of an OPT that is not entered, so the grace period has no date yet.
    unknown_end: tuple[str, ...] = ()
    if alone in (OPEN, YES):
        unknown_end = ("opt" if alone == OPEN else "opt.ead_end",)
        ends |= dict.fromkeys(unknown_end)
    # SPEC-resolutions point 17: an entered card with no end gives no grace date.
    card_ends = tuple(name for name in ("opt.ead_end", "stem.ead_end") if name in ends)
    unknown_end += tuple(name for name in card_ends if ends[name] is None)
    grace = "grace.after_completion_days"
    past_cards = _cap_gap_past_cards(work, case)

    def grace_ends(v: Values) -> Value:
        # Point 18: status runs on to the cap-gap end; what follows is for the DSO.
        if past_cards:
            return None
        return final_end + timedelta(days=_whole(v, grace))

    work.add("grace.ends", "date", ends, (grace,), grace_ends, needs=unknown_end)
    if case.stem is not None:
        _add_stem_items(work, opt, case.stem)
    # Points 20, 21 and 22: until each is answered the verdict is cannot_tell.
    later = len(questions)
    end_owed = _add_periods(work, case, ask)
    not_made = _passed_reports(work, ask)
    unconfirmed += tuple(question["id"] for question in questions[later:])
    lists: list[dict[str, Any]] = []
    if case.opt is not None and case.stem is None:
        _add_next_step(work, case.opt)
        lists = _lists(work)

    # Full-time CPT. Days that were not entered are never taken as zero: the zero is
    # the person's own statement, and the inputs say so.
    cpt_days = case.cpt_full_time_days
    cpt_inputs: dict[str, Any] = {CPT_DAYS: cpt_days}
    if cpt == NO:
        cpt_days = 0
        cpt_inputs[CPT_USED] = {
            "answer": False,
            "on": case.confirmations[CPT_USED].on.isoformat(),
        }
    elif cpt == OPEN:
        work.silent.add(CPT_DAYS)
    stated = cpt_days
    work.add(
        "cpt.full_time_days_used",
        "days",
        cpt_inputs,
        ("cpt.full_time_months_bar", CPT_BAR),
        lambda v: stated,
        needs=(CPT_DAYS,) if cpt in (OPEN, YES) else (),
    )
    if case.cap_gap is not None:
        _add_cap_gap(work, case.cap_gap)

    _missing_ead_dates(work, opt, case.stem)
    judgement_items = (*_judgement_items(work, case, cpt_days), *confirmed, *not_made)
    if held == NO:
        # The engine states no conclusion. The words of the law go with the judgement.
        work.show(STEM_FOLLOWS_OPT)
        judgement_items = (*judgement_items, "stem_without_post_completion_opt")
    if alone == NO:
        judgement_items = (*judgement_items, "cap_gap_without_training")
    if past_cards and "capgap.ends" in work.dated:
        judgement_items = (*judgement_items, "grace_with_cap_gap")
    # Point 25: the regimes give different answers only where an item shown carries an
    # alternate.
    shown = (*work.computed, *work.ahead)
    litigated = today > final_end and any("alternates" in entry for entry in shown)
    verdict = decide(
        VerdictInputs(
            documents_count=case.documents_count,
            missing_inputs=tuple(work.missing),
            conflicting_inputs=(*conflicts, *unsettled),
            rules_checked_on=pack.rules_checked_on,
            depends_on_litigated_rule=litigated,
            judgement_items=judgement_items,
            open_items=_open_items(work, end_owed),
            open_questions=unconfirmed,
        ),
        clock,
        today,
    )
    return {
        "verdict": {"state": verdict.state.value, "reasons": list(verdict.reasons)},
        "scope": {
            "documents_count": case.documents_count,
            "rules_checked_on": _shown(pack.rules_checked_on),
        },
        "computed": work.computed,
        "rulepacks": [{"category": pack.category, "version": pack.version}],
        "rules": work.rules,
        "questions": questions,
        "today": {"date": today.isoformat(), "time_zone": case.time_zone},
        "upcoming": sorted(work.ahead, key=lambda entry: str(entry["date"])),
        "lists": lists,
    }
