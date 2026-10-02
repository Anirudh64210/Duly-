"""Load and validate rule packs against contracts/rulepack.schema.json."""

import itertools
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator, FormatChecker

from engine.settings import SettingsError, dating_setting, load_settings

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "contracts" / "rulepack.schema.json"
PACKS_DIR = REPO_ROOT / "rulepacks"


QUOTE_NEEDED = frozenset({"settled", "guidance", "litigated", "proposed"})


class RulepackError(ValueError):
    pass


@dataclass(frozen=True)
class Rulepack:
    category: str
    version: str
    regimes: tuple[dict[str, Any], ...]
    parameters: tuple[dict[str, Any], ...]
    path: dict[str, Any] | None = None

    @property
    def rules_checked_on(self) -> date | None:
        """The oldest checked_on among the parameters, or None for an empty pack."""
        checked = [date.fromisoformat(p["source"]["checked_on"]) for p in self.parameters]
        return min(checked, default=None)

    def value(self, id: str, on: date, regime: str | None = None) -> dict[str, Any] | None:
        """The parameter in force on a date, or None when nothing is in force.

        With no regime named, the lookup runs under the operative regimes. A rule with no
        regime of its own applies under every regime, and a row written for the regime
        comes before it.
        """
        known = {r["id"] for r in self.regimes}
        if regime is None:
            wanted = {r["id"] for r in self.regimes if r["operative"]}
        elif regime in known:
            wanted = {regime}
        else:
            raise RulepackError(f"{id}: unknown regime {regime}")
        day = on.isoformat()
        in_force = [
            p
            for p in self.parameters
            if p["id"] == id
            and p["effective_from"] <= day
            and (p.get("effective_to") is None or day <= p["effective_to"])
        ]
        for regimes in (wanted, {""}):
            found = [p for p in in_force if p.get("regime", "") in regimes]
            if len(found) > 1:
                raise RulepackError(f"{id}: more than one operative regime holds this rule")
            if found:
                return found[0]
        return None


def _normalize(value: Any) -> Any:
    """YAML parses bare dates into date objects; the schema speaks ISO strings."""
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize(v) for v in value]
    return value


def validate_pack(raw: dict[str, Any]) -> Rulepack:
    schema = json.loads(SCHEMA_PATH.read_text())
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    data = _normalize(raw)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    if errors:
        first = errors[0]
        where = "/".join(str(p) for p in first.path) or "(root)"
        raise RulepackError(f"{where}: {first.message}")

    regimes = {r["id"]: r for r in data["regimes"]}
    seen: set[tuple[str, str, str]] = set()
    for p in data["parameters"]:
        regime = p.get("regime", "")
        if regime and regime not in regimes:
            raise RulepackError(f"{p['id']}: unknown regime {regime}")
        if p["status"] in QUOTE_NEEDED and not str(p["source"].get("quote", "")).strip():
            raise RulepackError(f"{p['id']}: a {p['status']} rule needs a quote from its source")
        key = (p["id"], regime, p["effective_from"])
        if key in seen:
            raise RulepackError(f"{p['id']}: duplicate for the same regime and start date")
        seen.add(key)
        end = p.get("effective_to")
        if end is not None and end < p["effective_from"]:
            raise RulepackError(f"{p['id']}: ends before it starts")
    _reject_overlaps(data["parameters"])
    _reject_misplaced_settings(data.get("path"), (), load_settings())
    if data.get("path"):
        _PathCheck(data["path"], data["parameters"]).run()

    return Rulepack(
        category=data["category"],
        version=data["version"],
        regimes=tuple(data["regimes"]),
        parameters=tuple(data["parameters"]),
        path=data.get("path"),
    )


def _reject_overlaps(parameters: list[dict[str, Any]]) -> None:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for p in parameters:
        groups.setdefault((p["id"], p.get("regime", "")), []).append(p)
    for (pid, _), group in groups.items():
        ordered = sorted(group, key=lambda p: str(p["effective_from"]))
        for earlier, later in itertools.pairwise(ordered):
            end = earlier.get("effective_to")
            if end is None or end >= later["effective_from"]:
                raise RulepackError(f"{pid}: effective dates overlap")


def _reject_misplaced_settings(node: Any, trail: tuple[Any, ...], settings: dict[str, Any]) -> None:
    """A product setting may move only the opens or closes of a stage's window, which makes
    it a planning window (contracts/rulepack.schema.json, setting), or a date a check compares
    against (D93). The schema shares the amount shape with every date, so the refusal anywhere
    else is here. The settings are read once per pack, by the caller."""
    if isinstance(node, list):
        for index, child in enumerate(node):
            _reject_misplaced_settings(child, (*trail, index), settings)
        return
    if not isinstance(node, dict):
        return
    is_amount = "setting" in node and set(node) <= {"setting", "sign"}
    # path/stages/<n>/windows/<n>/(opens|closes)/...
    in_window = trail[:1] == ("stages",) and trail[2:3] == ("windows",)
    in_window = in_window and trail[4:5] in (("opens",), ("closes",))
    if is_amount and not (in_window or trail[:1] == ("checks",)):
        where = "/".join(str(step) for step in ("path", *trail))
        raise RulepackError(
            f"{where}: the setting {node['setting']} may date only a stage window or a check"
        )
    if is_amount:
        # Refused here, not at the first compute: an unknown id, or a unit no date moves by.
        try:
            dating_setting(settings, node["setting"])
        except SettingsError as refused:
            where = "/".join(str(step) for step in ("path", *trail))
            raise RulepackError(f"{where}: {refused}") from refused
    for key, child in node.items():
        _reject_misplaced_settings(child, (*trail, key), settings)


# What the engine can read, refused at load rather than read as unknown at compute
# (specs/step-w/SPEC-W2-UNKNOWN.md points 7a and 11).
ADDABLE_UNITS = frozenset({"days", "business_days", "months", "years"})
MONTH_DAY = re.compile(r"^(\d{2})-(\d{2})$")
DATE_OPERATORS = ("on_or_before", "on_or_after", "before", "after")
LEVEL_OPERATORS = ("level_above", "level_same", "level_below")
JOIN_OPERATORS = ("same_as", "differs_from")
COMPARISONS = ("in", *DATE_OPERATORS, *LEVEL_OPERATORS, *JOIN_OPERATORS, "month_day_is", "at_most")
UNWORKED_WHEN = ("window_opens", "window_closes")
UNWORKED_STAGE = ("follows", "gap_allowed")
Trail = tuple[Any, ...]


def _where(trail: Trail) -> str:
    return "/".join(str(step) for step in ("path", *trail))


class _PathCheck:
    """One walk over a pack's path with the record kind of `this` and `outer` in scope."""

    def __init__(self, path: dict[str, Any], parameters: list[dict[str, Any]]) -> None:
        self.path = path
        self.rows: dict[str, list[dict[str, Any]]] = {}
        for p in parameters:
            self.rows.setdefault(p["id"], []).append(p)
        self.fields: dict[str, dict[str, dict[str, Any]]] = {
            k["id"]: {f["id"]: f for f in k["fields"]} for k in path.get("records", [])
        }
        self.ordered = {(o["record"], o["field"]) for o in path.get("order", [])}
        # The where conditions that chose the record of this and of outer, where one did.
        self.chosen: dict[str, tuple[dict[str, Any], ...]] = {}

    def refuse(self, trail: Trail, message: str) -> None:
        raise RulepackError(f"{_where(trail)}: {message}")

    def run(self) -> None:
        for k, kind in enumerate(self.path.get("records", [])):
            for f, decl in enumerate(kind["fields"]):
                self.field(kind["id"], decl, ("records", k, "fields", f))
        for o, order in enumerate(self.path.get("order", [])):
            self.order(order, ("order", o))
        for s, stage in enumerate(self.path.get("stages", [])):
            self.stage(stage, ("stages", s))
        for c, check in enumerate(self.path.get("checks", [])):
            self.check(check, ("checks", c))
        for c, counter in enumerate(self.path.get("counters", [])):
            self.counter(counter, ("counters", c))

    # Rules.

    def rule(self, rule_id: str, trail: Trail) -> list[dict[str, Any]]:
        rows = self.rows.get(rule_id)
        if not rows:
            self.refuse(trail, f"the pack holds no rule {rule_id}")
        return rows or []

    def number_rule(self, rule_id: str, trail: Trail) -> list[dict[str, Any]]:
        rows = self.rule(rule_id, trail)
        for row in rows:
            value = row["value"]
            if isinstance(value, bool) or not isinstance(value, int | float):
                self.refuse(trail, f"the rule {rule_id} holds {value!r}, not a number")
        return rows

    def amount(self, amount: dict[str, Any], trail: Trail) -> None:
        if "rule" not in amount:
            return  # a setting: _reject_misplaced_settings reads it
        for row in self.number_rule(amount["rule"], trail):
            if row["unit"] not in ADDABLE_UNITS:
                unit = row["unit"]
                self.refuse(trail, f"the rule {amount['rule']} is in {unit}, no date moves by")

    def month_day_rule(self, rule_id: str, trail: Trail) -> None:
        for row in self.rule(rule_id, trail):
            found = MONTH_DAY.match(str(row["value"]))
            try:
                # 2000 is a leap year, so 02-29 reads.
                date(2000, int(found.group(1)), int(found.group(2))) if found else None
            except ValueError:
                found = None
            if found is None:
                self.refuse(trail, f"the rule {rule_id} holds {row['value']!r}, not a month-day")

    def rule_ids(self, ids: list[str], trail: Trail) -> None:
        for rule_id in ids:
            self.rule(rule_id, trail)

    # Fields and paths.

    def decl(self, kind: str | None, name: str) -> dict[str, Any] | None:
        return self.fields.get(kind or "", {}).get(name)

    def date_field(self, kind: str, name: str, trail: Trail) -> None:
        decl = self.decl(kind, name)
        if decl is None or decl["kind"] != "date":
            self.refuse(trail, f"{name} is not a date field of {kind}")

    def resolve(
        self, path: str, this: str | None, outer: str | None, trail: Trail
    ) -> list[tuple[str, dict[str, Any], str]]:
        """Each (kind, declaration, prefix) a path steps through, for a path over records."""
        head, *rest = path.split(".")
        if head not in ("this", "outer") or not rest:
            return []
        kind = this if head == "this" else outer
        if kind is None:
            self.refuse(trail, f"{path}: {head} names no record here")
        kinds = [kind] if kind else []
        steps: list[tuple[str, dict[str, Any], str]] = []
        prefix = head
        for index, name in enumerate(rest):
            prefix = f"{prefix}.{name}"
            found = [(k, d) for k in kinds if (d := self.decl(k, name)) is not None]
            steps += [(k, d, prefix) for k, d in found]
            if index < len(rest) - 1:
                kinds = [t for _, d in found if d["kind"] == "link" for t in d.get("to", [])]
        return steps

    def last(
        self, path: str, this: str | None, outer: str | None, trail: Trail
    ) -> list[tuple[str, dict[str, Any]]]:
        """The (kind, declaration) a path ends on."""
        name = path.rsplit(".", 1)[-1]
        steps = self.resolve(path, this, outer, trail)
        return [(k, d) for k, d, prefix in steps if prefix == path and d["id"] == name]

    def can_be_none(self, decl: dict[str, Any], prefix: str) -> bool:
        """Whether the field at prefix can read as NONE. A conditional none is ruled out when
        the record's own selection chooses only records its conditions cannot hold for."""
        declared = decl.get("when_absent", "ask")
        if not isinstance(declared, dict):
            return bool(declared == "none")
        if declared.get("else") == "none":
            return True
        head, _, rest = prefix.partition(".")
        chosen = self.chosen.get(head, ()) if "." not in rest else ()
        return "none" in declared and not any(_ruled_out(c, chosen) for c in declared["none"])

    def field(self, kind: str, decl: dict[str, Any], trail: Trail) -> None:
        history = decl.get("history")
        if history:
            self.date_field(history["record"], history["from"], (*trail, "history", "from"))
        declared = decl.get("when_absent")
        if isinstance(declared, dict):
            for state in ("not_yet", "none"):
                at = (*trail, "when_absent", state)
                self.conditions(declared.get(state, []), kind, None, at)
                for read in _paths(declared.get(state, [])):
                    for _, other in self.last(read, kind, None, at):
                        if isinstance(other.get("when_absent"), dict):
                            name = other["id"]
                            self.refuse(at, f"reads {name}, whose own absence is conditional")

    def order(self, order: dict[str, Any], trail: Trail) -> None:
        # An order may leave choices unranked when no source ranks them (D93); a comparison
        # that reaches one is unknown at compute, never refused here.
        self.rule_ids(order["rule_ids"], trail)

    # Dates.

    def when(self, w: dict[str, Any], this: str | None, outer: str | None, trail: Trail) -> None:
        for key in UNWORKED_WHEN:
            if key in w:
                self.refuse(trail, f"{key} is not worked by the engine yet")
        if "fact" in w:
            self.resolve(w["fact"], this, outer, trail)
        for key in ("in_year_of", "in_fiscal_year_of"):
            if key in w:
                self.resolve(w[key], this, outer, (*trail, key))
        for key in ("month_day_rule", "fiscal_year_rule"):
            if key in w:
                self.month_day_rule(w[key], (*trail, key))
        if "as_of" in w:
            self.when(w["as_of"], this, outer, (*trail, "as_of"))
        for key in ("earliest_of", "latest_of"):
            for m, member in enumerate(w.get(key, [])):
                self.when(member, this, outer, (*trail, key, m))
        if "first" in w:
            first = w["first"]
            at = (*trail, "first")
            self.selector(first["of"], this, (*at, "of"))
            kind = first["of"]["record"]
            ends = self.last(f"this.{first['field']}", kind, this, (*at, "field"))
            if not ends or any(d["kind"] != "date" for _, d in ends):
                self.refuse((*at, "field"), f"{first['field']} is not a date field of {kind}")
        for a, amount in enumerate(w.get("add", [])):
            self.amount(amount, (*trail, "add", a))

    # Conditions.

    def selector(self, selector: dict[str, Any], outer: str | None, trail: Trail) -> str:
        kind = str(selector["record"])
        if kind not in self.fields:
            self.refuse(trail, f"the pack declares no record kind {kind}")
        saved = dict(self.chosen)
        where = tuple(selector.get("where", []))
        self.chosen = {"this": where, "outer": saved.get("this", ())}
        self.conditions(list(where), kind, outer, (*trail, "where"))
        self.chosen = saved
        return kind

    def conditions(
        self,
        conds: list[dict[str, Any]],
        this: str | None,
        outer: str | None,
        trail: Trail,
        holds: bool = False,
        negated: bool = False,
        guards: frozenset[str] = frozenset(),
    ) -> None:
        """A list of conditions, all to hold: a present: true among them guards the others."""
        guards |= {c["field"] for c in conds if c.get("present") is True and "field" in c}
        for i, c in enumerate(conds):
            self.cond(c, this, outer, (*trail, i), holds, negated, guards)

    def cond(
        self,
        c: dict[str, Any],
        this: str | None,
        outer: str | None,
        trail: Trail,
        holds: bool,
        negated: bool,
        guards: frozenset[str],
    ) -> None:
        sides = [c["field"]] if "field" in c else []
        ends = self.last(c["field"], this, outer, trail) if sides else []
        if "in" in c:
            choices = {ch for _, d in ends for ch in d.get("choices", [])}
            for value in c["in"]:
                if choices and value not in choices:
                    self.refuse(trail, f"{value} is not a choice of {c['field']}")
        for key in DATE_OPERATORS:
            if key in c:
                self.when(c[key], this, outer, (*trail, key))
        for key in LEVEL_OPERATORS:
            if key in c:
                name = c["field"].rsplit(".", 1)[-1]
                if not ends or any((k, d["id"]) not in self.ordered for k, d in ends):
                    self.refuse(trail, f"{key} on {name}, a field with no order")
                if str(c[key]).split(".")[0] in ("this", "outer"):
                    sides.append(c[key])
        for key in JOIN_OPERATORS:
            if key in c:
                sides.append(c[key])
        for side in sides:
            self.resolve(side, this, outer, trail)
        if "month_day_is" in c:
            self.month_day_rule(c["month_day_is"], (*trail, "month_day_is"))
        if "at_most" in c:
            self.number_rule(c["at_most"].get("rule", ""), (*trail, "at_most"))
        for key in ("exists", "none"):
            if key in c:
                self.selector(c[key], this, (*trail, key))
        for key in ("count_below", "count_at_most"):
            if key in c:
                self.selector(c[key]["of"], this, (*trail, key, "of"))
                self.number_rule(c[key]["rule"], (*trail, key))
        if "all_of" in c:
            self.conditions(c["all_of"], this, outer, (*trail, "all_of"), holds, negated, guards)
        for i, sub in enumerate(c.get("any_of", [])):
            self.cond(sub, this, outer, (*trail, "any_of", i), holds, negated, guards)
        if "not" in c:
            self.cond(c["not"], this, outer, (*trail, "not"), holds, not negated, guards)
        if (holds or negated) and any(key in c for key in COMPARISONS):
            self.none_lint(sides, this, outer, trail, guards)

    def none_lint(
        self,
        sides: list[str],
        this: str | None,
        outer: str | None,
        trail: Trail,
        guards: frozenset[str],
    ) -> None:
        """Point 7a: NONE is false in a comparison, so a raised conflict or a `not` would turn
        "there is none" into a finding, unless present: true guards the field."""
        for side in sides:
            for _, decl, prefix in self.resolve(side, this, outer, trail):
                guarded = any(g == prefix or g.startswith(f"{prefix}.") for g in guards)
                if self.can_be_none(decl, prefix) and not guarded:
                    self.refuse(
                        trail,
                        f"{decl['id']} can be none, so this comparison needs present: true "
                        "on it in the same all_of",
                    )

    # Stages, checks and counters.

    def top(self, selector: dict[str, Any] | None) -> None:
        """At the top of a stage, check or counter, this and outer are its own record."""
        where = tuple((selector or {}).get("where", []))
        self.chosen = {"this": where, "outer": where}

    def stage(self, stage: dict[str, Any], trail: Trail) -> None:
        for key in UNWORKED_STAGE:
            if key in stage:
                self.refuse((*trail, key), f"{key} is not worked by the engine yet")
        kind = None
        if "for_each" in stage:
            kind = self.selector(stage["for_each"], None, (*trail, "for_each"))
        self.top(stage.get("for_each"))
        for path in stage["entered_when"]:
            self.resolve(path, kind, kind, (*trail, "entered_when"))
        span = stage.get("span") or {}
        for key in ("starts", "ends"):
            if key in span:
                self.when(span[key], kind, kind, (*trail, "span", key))
        if "longest" in span:
            self.amount(span["longest"], (*trail, "span", "longest"))
        for e, also in enumerate(span.get("ends_also", [])):
            self.when(also["when"], kind, kind, (*trail, "span", "ends_also", e))
            self.rule_ids(also["rule_ids"], (*trail, "span", "ends_also", e))
        for w, window in enumerate(stage.get("windows", [])):
            at = (*trail, "windows", w)
            for key in ("opens", "closes"):
                self.when(window[key], kind, kind, (*at, key))
            for path in window.get("done_when", []):
                self.resolve(path, kind, kind, (*at, "done_when"))
            self.rule_ids(window.get("rule_ids", []), at)
        for li, entry in enumerate(stage.get("lists", [])):
            if isinstance(entry, dict) and "only_if" in entry:
                at = (*trail, "lists", li, "only_if")
                self.refuse(at, "only_if is not worked by the engine yet")
        for n, step in enumerate(stage.get("next", [])):
            if isinstance(step, dict):
                at = (*trail, "next", n)
                self.conditions(step.get("only_if", []), kind, kind, (*at, "only_if"))
                for source in step.get("bind", {}).values():
                    self.resolve(str(source), kind, kind, (*at, "bind"))
        self.rule_ids(stage["rule_ids"], trail)

    def check(self, check: dict[str, Any], trail: Trail) -> None:
        kind = None
        if "for_each" in check:
            kind = self.selector(check["for_each"], None, (*trail, "for_each"))
        self.top(check.get("for_each"))
        self.conditions(check.get("only_if", []), kind, kind, (*trail, "only_if"))
        self.conditions(check["holds"], kind, kind, (*trail, "holds"), holds=True)
        self.rule_ids(check["rule_ids"], trail)

    def counter(self, counter: dict[str, Any], trail: Trail) -> None:
        scope = counter["scope"]
        kind = self.selector(scope["of"], None, (*trail, "scope", "of"))
        self.top(scope["of"])
        link = scope.get("chain_link")
        if link is not None:
            decl = self.decl(kind, link)
            if decl is None or decl["kind"] != "link":
                self.refuse((*trail, "scope", "chain_link"), f"{link} is not a link of {kind}")
        if "value_of" in scope:
            self.resolve(scope["value_of"], kind, kind, (*trail, "scope", "value_of"))
        span = counter.get("span") or {}
        for key in ("starts", "ends"):
            if key in span:
                self.when(span[key], kind, kind, (*trail, "span", key))
        for key in ("qualifying", "not_qualifying"):
            if key in counter:
                other = self.selector(counter[key], kind, (*trail, key))
                dates = [d for d in self.fields[other].values() if d["kind"] == "date"]
                if len(dates) < 2:
                    self.refuse((*trail, key), f"{other} has no two date fields to span")
        self.conditions(counter.get("only_if", []), kind, kind, (*trail, "only_if"))
        for key in ("hours_rule", "limit_rule"):
            if key in counter:
                self.number_rule(counter[key], (*trail, key))
        self.rule_ids(counter["rule_ids"], trail)


def _ruled_out(cond: dict[str, Any], chosen: tuple[dict[str, Any], ...]) -> bool:
    """A condition the choosing conditions prove false: the record was chosen for a field
    `in` some choices, and the condition asks the field `in` none of them, or `not in` all."""
    known = {c["field"]: set(c["in"]) for c in chosen if "field" in c and "in" in c}
    inner = cond.get("not")
    if isinstance(inner, dict) and inner.get("field") in known and "in" in inner:
        return known[inner["field"]] <= set(inner["in"])
    if cond.get("field") in known and "in" in cond:
        return not known[cond["field"]] & set(cond["in"])
    return False


def _paths(conds: list[dict[str, Any]]) -> list[str]:
    """Every path a list of conditions reads, at any depth, outside selectors."""
    found: list[str] = []
    for c in conds:
        found += [c[key] for key in ("field", *JOIN_OPERATORS) if isinstance(c.get(key), str)]
        found += _paths(c.get("all_of", []) + c.get("any_of", []))
        if "not" in c:
            found += _paths([c["not"]])
    return found


def load_pack(path: Path) -> Rulepack:
    raw = yaml.safe_load(path.read_text())
    if not isinstance(raw, dict):
        raise RulepackError(f"{path}: not a mapping")
    return validate_pack(raw)


def load_all(packs_dir: Path = PACKS_DIR) -> list[Rulepack]:
    return [load_pack(p) for p in sorted(packs_dir.glob("*/v*/parameters.yaml"))]
