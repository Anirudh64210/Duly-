"""The F-1 engine: dates and counts from the dates a user entered.

Every number has a source. A number that is law comes from the pack by id. A number
that is Duly's own choice comes from the settings by id, and the item lists the id under
duly_settings in its inputs. The engine reports dates and counts. It never says what
they mean for the user.
"""

from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from engine.clocks import Clock
from engine.dates import add_business_days, add_months, add_years
from engine.rulepack import Rulepack, RulepackError
from engine.settings import load_settings, whole_setting
from engine.verdict import VerdictInputs, decide

# SPEC, "Rules of the house": from strongest to weakest.
STATUS_ORDER = ("settled", "guidance", "school", "litigated", "proposed")

OPEN_ITEM_ENDINGS = ("_due", "file_by", "window_closes")
CAP_GAP_ACTIVE = ("pending", "approved")

# Duly's own choices, in contracts/product_settings.yaml.
LOOKAHEAD = "product.open_item_lookahead_days"
OPT_START_LOOKBACK = "product.opt_start_earliest_years_before_program_end"

# Rules that are law without being the value of one item.
HOLIDAYS_LAW = "calendar.federal_holidays_law"
CPT_BAR = "cpt.full_time_bar_days"
FISCAL_YEAR_START = "capgap.fiscal_year_start_month_day"
REPORT_EMPLOYER = "opt.report_employer_within_days"

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
class F1Case:
    program_end_date: date
    degree_level: str
    documents_count: int
    cpt_full_time_days: int
    opt: EadBlock | None
    stem: EadBlock | None
    employment: tuple[EmploymentPeriod, ...]
    cap_gap: CapGap | None


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


def parse_case(raw: dict[str, Any]) -> F1Case:
    """A case that matches contracts/case_f1.schema.json, as frozen dataclasses."""
    cap_gap = raw.get("cap_gap")
    return F1Case(
        program_end_date=date.fromisoformat(raw["program_end_date"]),
        degree_level=raw["degree_level"],
        documents_count=raw["documents_count"],
        cpt_full_time_days=raw.get("cpt_full_time_days", 0),
        opt=_ead_block(raw.get("opt")),
        stem=_ead_block(raw.get("stem")),
        employment=tuple(
            EmploymentPeriod(
                start=date.fromisoformat(p["start"]),
                end=_date(p["end"]),
                hours_per_week=p["hours_per_week"],
                employer_reported=p["employer_reported"],
            )
            for p in raw["employment"]
        ),
        cap_gap=None
        if cap_gap is None
        else CapGap(
            petition_filed_on=date.fromisoformat(cap_gap["petition_filed_on"]),
            requested_start=date.fromisoformat(cap_gap["requested_start"]),
            change_of_status=cap_gap["change_of_status"],
            status=cap_gap["status"],
        ),
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

    def name_missing(self, name: str) -> None:
        if name not in self.missing:
            self.missing.append(name)

    def setting(self, setting_id: str) -> int:
        return whole_setting(self.settings, setting_id)

    def whole_rule(self, rule_id: str) -> int:
        """The operative value of a rule that decides which items there are."""
        return _whole({rule_id: self._rule(rule_id)["value"]}, rule_id)

    def _rule(self, rule_id: str) -> dict[str, Any]:
        found = self.pack.value(rule_id, self.today)
        if found is None:
            raise RulepackError(f"{rule_id}: no rule in force on {self.today.isoformat()}")
        return found

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
        self.rules[parameter["id"]] = shown

    def _alternates(
        self, rule_ids: tuple[str, ...], formula: Callable[[Values], Value]
    ) -> list[dict[str, Any]]:
        """The value under each regime that is not operative and holds one of the rules."""
        found = []
        for regime in self.pack.regimes:
            if regime["operative"]:
                continue
            under = {r: self.pack.value(r, self.today, regime=regime["id"]) for r in rule_ids}
            if any(p is None for p in under.values()):
                continue
            if not any(p is not None and p.get("regime") == regime["id"] for p in under.values()):
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
    ) -> None:
        """One computed item. needs names the inputs the formula cannot do without: if
        one is missing the value is null and the input is named, never guessed. settings
        names Duly's own choices that were used on the item's inputs."""
        parameters = [self._rule(rule_id) for rule_id in rule_ids]
        for parameter in parameters:
            self._show_rule(parameter)
        absent = [name for name in needs if inputs[name] is None]
        for name in absent:
            self.name_missing(name)

        def guarded(values: Values) -> Value:
            return None if absent else formula(values)

        value = guarded({p["id"]: p["value"] for p in parameters})
        item: dict[str, Any] = {
            "id": item_id,
            "value": _shown(value),
            "unit": unit,
            "inputs": {name: _shown(entered) for name, entered in inputs.items()},
            "rule_ids": list(rule_ids),
            "status": max((p["status"] for p in parameters), key=STATUS_ORDER.index),
        }
        # The look-ahead decides whether a dated item of this kind is an open item.
        if isinstance(value, date) and item_id.endswith(OPEN_ITEM_ENDINGS):
            settings = (*settings, LOOKAHEAD)
        if settings:
            item["inputs"]["duly_settings"] = list(settings)
        alternates = self._alternates(rule_ids, guarded)
        if alternates:
            item["alternates"] = alternates
        self.computed.append(item)
        if isinstance(value, date):
            self.dated[item_id] = value
        elif value is not None:
            self.numbers[item_id] = value


def _count_days(
    case: F1Case, opt: EadBlock, today: date, opt_min: float, stem_min: float
) -> tuple[int, int] | None:
    """Days used and days under hours, or None when the window cannot be known."""
    blocks = [opt] if case.stem is None else [opt, case.stem]
    ends = [block.ead_end for block in blocks]
    stem_start = None if case.stem is None else case.stem.ead_start
    if opt.ead_start is None or None in ends or (case.stem is not None and stem_start is None):
        return None
    last = min(today, max(end for end in ends if end is not None))
    used = 0
    under = 0
    day = opt.ead_start
    while day <= last:
        threshold = stem_min if stem_start is not None and day >= stem_start else opt_min
        hours = [
            p.hours_per_week
            for p in case.employment
            if p.start <= day <= (today if p.end is None else p.end)
        ]
        if not hours:
            used += 1
        elif max(hours) < threshold:
            under += 1
        day += timedelta(days=1)
    return used, under


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
    for item_id in ("opt.apply_window_closes", "opt.latest_start"):
        work.add(
            item_id,
            "date",
            inputs,
            ("opt.apply_after_days",),
            lambda v: end + timedelta(days=_whole(v, "opt.apply_after_days")),
        )
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
    work.add(
        f"{part}.file_by",
        "date",
        {name: recommended},
        (rule_id,),
        lambda v: None if recommended is None else recommended + timedelta(days=_whole(v, rule_id)),
        needs=(name,),
    )


def _add_counts(work: _Working, case: F1Case, opt: EadBlock) -> None:
    today = work.today
    stem = case.stem
    on_stem = stem is not None and stem.ead_start is not None and today >= stem.ead_start
    limit_rule = "stem.unemployment_limit_days" if on_stem else "opt.unemployment_limit_days"
    hours_rules: tuple[str, ...] = ("opt.min_hours_per_week",)
    window: dict[str, Any] = {"opt.ead_start": opt.ead_start, "opt.ead_end": opt.ead_end}
    if stem is not None:
        hours_rules = (*hours_rules, "stem.min_hours_per_week")
        window |= {"stem.ead_start": stem.ead_start, "stem.ead_end": stem.ead_end}
    counting_inputs = {**window, "today": today, "employment": _employment_shown(case)}

    def counts(v: Values) -> tuple[int, int] | None:
        opt_min = _number(v, "opt.min_hours_per_week")
        stem_min = _number(v, "stem.min_hours_per_week") if stem is not None else opt_min
        return _count_days(case, opt, today, opt_min, stem_min)

    # Days used do not turn on the hours rules: a day is used when no period covers it.
    found = _count_days(case, opt, today, 0, 0)
    used = None if found is None else found[0]

    def under_hours(v: Values) -> int | None:
        counted = counts(v)
        return None if counted is None else counted[1]

    work.add(
        "unemployment.limit",
        "days",
        {"stem.ead_start": None if stem is None else stem.ead_start, "today": today},
        (limit_rule,),
        lambda v: _whole(v, limit_rule),
    )
    # opt.ead_start is checked against the earliest start Duly takes as entered right.
    checked = (OPT_START_LOOKBACK,)
    work.add(
        "unemployment.days_used",
        "days",
        counting_inputs,
        (limit_rule,),
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
        lambda v: sum(1 for p in case.employment if not p.employer_reported),
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
    if opt is not None:
        opt_end = opt.ead_end
        before = "stem.apply_before_expiry_days"
        work.add(
            "stem.apply_window_opens",
            "date",
            {"opt.ead_end": opt_end},
            (before,),
            lambda v: None if opt_end is None else opt_end - timedelta(days=_whole(v, before)),
            needs=("opt.ead_end",),
        )
        work.add(
            "stem.apply_window_closes",
            "date",
            {"opt.ead_end": opt_end},
            (before,),
            lambda v: opt_end,
            needs=("opt.ead_end",),
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
        work.add(
            f"stem.validation_{report}_due",
            "date",
            {"stem.ead_start": start},
            (interval, within, extension, HOLIDAYS_LAW),
            validation_due(report),
            needs=("stem.ead_start",),
        )
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
        "stem.final_evaluation_due",
        "date",
        {"stem.ead_end": end},
        (due,),
        lambda v: None if end is None else end + timedelta(days=_whole(v, due)),
        needs=("stem.ead_end",),
    )


def _add_cap_gap(work: _Working, cap_gap: CapGap) -> None:
    requested = cap_gap.requested_start
    active = cap_gap.status in CAP_GAP_ACTIVE and cap_gap.change_of_status

    def formula(v: Values) -> Value:
        if not active:
            return None
        month, day = _month_day(v, "capgap.end_month_day")
        # A start on or after the first day of the fiscal year is in the fiscal year
        # whose end date falls in the next calendar year.
        later = (requested.month, requested.day) >= _month_day(v, FISCAL_YEAR_START)
        return min(requested, date(requested.year + (1 if later else 0), month, day))

    work.add(
        "capgap.ends",
        "date",
        {
            "cap_gap.requested_start": requested,
            "cap_gap.status": cap_gap.status,
            "cap_gap.change_of_status": cap_gap.change_of_status,
        },
        ("capgap.end_month_day", FISCAL_YEAR_START),
        formula,
    )


def _missing_ead_dates(work: _Working, case: F1Case) -> None:
    for part, block in (("opt", case.opt), ("stem", case.stem)):
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


def _judgement_items(work: _Working, case: F1Case) -> tuple[str, ...]:
    found = []
    if work.numbers.get("employment.days_under_hours", 0) > 0:
        found.append("hours_under_threshold")
    remaining = work.numbers.get("unemployment.days_remaining")
    if remaining is not None and remaining <= 0:
        found.append("unemployment_at_or_over_limit")
    if case.cpt_full_time_days >= work.whole_rule(CPT_BAR):
        found.append("cpt_full_time_at_or_over_bar")
    if case.cap_gap is not None and "capgap.ends" not in work.dated:
        found.append("cap_gap_petition_not_active")
    return tuple(found)


def _open_items(work: _Working) -> tuple[str, ...]:
    found = []
    if work.numbers.get("employment.periods_not_reported", 0) > 0:
        found.append("report_employer")
    horizon = work.today + timedelta(days=work.setting(LOOKAHEAD))
    for item_id, day in work.dated.items():
        if item_id.endswith(OPEN_ITEM_ENDINGS) and work.today <= day <= horizon:
            found.append(item_id)
    return tuple(found)


def compute_f1(
    case: F1Case, pack: Rulepack, clock: Clock, *, settings: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Every F-1 date and count for the case, in the shape of the engine output contract.

    settings holds Duly's own choices in the shape of contracts/product_settings.yaml
    once parsed. None means the shipped file.
    """
    today = clock.today()
    work = _Working(pack, today, load_settings() if settings is None else settings)

    _add_program_items(work, case)
    if case.opt is not None:
        _add_file_by(work, "opt", case.opt)
        _add_counts(work, case, case.opt)
    final_end, ends = _final_end(case)
    grace = "grace.after_completion_days"
    work.add(
        "grace.ends",
        "date",
        ends,
        (grace,),
        lambda v: final_end + timedelta(days=_whole(v, grace)),
    )
    if case.stem is not None:
        _add_stem_items(work, case.opt, case.stem)
    work.add(
        "cpt.full_time_days_used",
        "days",
        {"cpt_full_time_days": case.cpt_full_time_days},
        ("cpt.full_time_months_bar", CPT_BAR),
        lambda v: case.cpt_full_time_days,
    )
    if case.cap_gap is not None:
        _add_cap_gap(work, case.cap_gap)

    _missing_ead_dates(work, case)
    verdict = decide(
        VerdictInputs(
            documents_count=case.documents_count,
            missing_inputs=tuple(work.missing),
            conflicting_inputs=_conflicts(case, work.setting(OPT_START_LOOKBACK)),
            rules_checked_on=pack.rules_checked_on,
            depends_on_litigated_rule=today > final_end,
            judgement_items=_judgement_items(work, case),
            open_items=_open_items(work),
        ),
        clock,
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
    }
