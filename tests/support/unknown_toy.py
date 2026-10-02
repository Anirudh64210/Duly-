"""The toy pack of specs/step-w/SPEC-W2-UNKNOWN.md point 44 (and 50b): category j1, nothing
about F-1, so a test that passes on it passes only for an engine that reads the pack.

It uses every operator of contracts/rulepack.schema.json, every `when` shape, every calculator
and group, a history, an `optional` member, `ends_also`, `bind` and a next stage, a conditional
`when_absent` (point 2a), declared facts (point 25) and a rule row not in force on some day
(toy.lapsing: in force 2026-01-01 to 2026-12-31 only). tests/unit/engine/test_toy_pack_coverage.py
holds it to that.

Kinds: course (c), card (k), job (w), change (x), employer (e). It holds no expected value:
every expected date and count is worked out by hand in the test that uses it.
"""

import copy
from datetime import date
from typing import Any

from engine.rulepack import Rulepack, validate_pack
from tests.support.w2_pack import schema_problems, toy_row

CATEGORY = "j1"

# toy.lapsing is in force on 2026 only: today before 2026-01-01 or after 2026-12-31 reads it as
# a lapse (point 10, P7, R28, R33).
LAPSING_FROM = "2026-01-01"
LAPSING_TO = "2026-12-31"


def _lapsing(rule_id: str, value: Any, unit: str) -> dict[str, Any]:
    row = toy_row(rule_id, value, unit)
    row["effective_from"] = LAPSING_FROM
    row["effective_to"] = LAPSING_TO
    return row


RULES = [
    toy_row("toy.definition", True, "flag"),
    toy_row("toy.before_days", 20, "days"),
    toy_row("toy.after_days", 10, "business_days"),
    toy_row("toy.months", 12, "months"),
    toy_row("toy.hours", 20, "hours_per_week"),
    toy_row("toy.bar", 30, "days"),
    toy_row("toy.month_bar", 6, "months"),
    toy_row("toy.cap", 2, "count"),
    toy_row("toy.renewal_day", "03-01", "date"),
    toy_row("toy.fiscal_start", "10-01", "date"),
    toy_row("toy.longest", 24, "months"),
    _lapsing("toy.lapsing", 40, "days"),
    _lapsing("toy.lapsing_hours", 20, "hours_per_week"),
]

LEVELS = ["low", "mid", "high"]

# A card's dates are not yet while no decision has come (the shape of point 61's card dates);
# its employer is none on every type but extra (point 2a's second example).
NO_DECISION_YET = [
    {
        "any_of": [
            {"field": "this.decision", "present": False},
            {"field": "this.decision", "in": ["pending"]},
        ]
    }
]

RECORDS: list[dict[str, Any]] = [
    {
        "id": "course",
        "label": "Course",
        "id_prefix": "c",
        "max_records": 9,
        "complete_label": "Is this every course?",
        "fields": [
            {"id": "level", "kind": "choice", "label": "Level", "choices": LEVELS},
            {"id": "mode", "kind": "choice", "label": "Mode", "choices": ["day", "night"]},
            {"id": "start", "kind": "date", "label": "Start"},
            {
                "id": "end",
                "kind": "date",
                "label": "End",
                "history": {
                    "record": "change",
                    "link": "course",
                    "old": "old_end",
                    "new": "new_end",
                    "from": "granted_on",
                },
            },
            {"id": "online", "kind": "flag", "label": "Online"},
            {"id": "credits", "kind": "count", "label": "Credits"},
            {"id": "code", "kind": "text", "label": "Code", "max_length": 8},
            {"id": "joined_on", "kind": "date", "label": "Joined", "happened": True},
            {"id": "left_on", "kind": "date", "label": "Left", "when_absent": "not_yet"},
            {
                "id": "follows",
                "kind": "link",
                "label": "Follows",
                "to": ["course"],
                "when_absent": "none",
            },
        ],
    },
    {
        "id": "card",
        "label": "Card",
        "id_prefix": "k",
        "max_records": 9,
        "complete_label": "Is this every card?",
        "fields": [
            {"id": "type", "kind": "choice", "label": "Type", "choices": ["plain", "extra"]},
            {"id": "course", "kind": "link", "label": "Course", "to": ["course"]},
            {
                "id": "extends",
                "kind": "link",
                "label": "Extends",
                "to": ["card"],
                "when_absent": "none",
            },
            {
                "id": "employer",
                "kind": "link",
                "label": "Employer",
                "to": ["employer"],
                "when_absent": {"none": [{"field": "this.type", "in": ["plain"]}]},
            },
            {
                "id": "decision",
                "kind": "choice",
                "label": "Decision",
                "choices": ["pending", "approved"],
                "when_absent": "not_yet",
            },
            {
                "id": "card_start",
                "kind": "date",
                "label": "Card start",
                "when_absent": {"not_yet": NO_DECISION_YET},
            },
            {
                "id": "card_end",
                "kind": "date",
                "label": "Card end",
                "when_absent": {"not_yet": NO_DECISION_YET},
            },
            {
                "id": "filed_on",
                "kind": "date",
                "label": "Filed",
                "happened": True,
                "when_absent": "not_yet",
            },
        ],
    },
    {
        "id": "job",
        "label": "Job",
        "id_prefix": "w",
        "max_records": 9,
        "grows_with_time": True,
        "complete_label": "Is this every job?",
        "fields": [
            {"id": "under", "kind": "link", "label": "Under", "to": ["card"]},
            {
                "id": "on_campus",
                "kind": "link",
                "label": "On campus at",
                "to": ["course"],
                "when_absent": "none",
            },
            {"id": "start", "kind": "date", "label": "Start"},
            {"id": "end", "kind": "date", "label": "End", "when_absent": "not_yet"},
            {"id": "hours_per_week", "kind": "number", "label": "Hours"},
            {"id": "reported", "kind": "flag", "label": "Reported"},
            {"id": "hours_changes", "kind": "periods", "label": "Hours changes"},
        ],
    },
    {
        "id": "change",
        "label": "Change of end",
        "id_prefix": "x",
        "max_records": 9,
        "complete_label": "Is this every change of end?",
        "fields": [
            {"id": "course", "kind": "link", "label": "Course", "to": ["course"]},
            {"id": "old_end", "kind": "date", "label": "Old end"},
            {"id": "new_end", "kind": "date", "label": "New end"},
            {"id": "granted_on", "kind": "date", "label": "Granted"},
        ],
    },
    {
        "id": "employer",
        "label": "Employer",
        "id_prefix": "e",
        "max_records": 9,
        "fields": [
            {"id": "name", "kind": "text", "label": "Name"},
            {
                "id": "verified",
                "kind": "choice",
                "label": "Verified",
                "choices": ["yes", "no"],
                "not_sure": True,
            },
        ],
    },
]

FACTS = [
    {"id": "arrived_on", "kind": "date", "label": "Arrived"},
    {"id": "visits", "kind": "count", "label": "Visits"},
]

ORDER = [
    {"record": "course", "field": "level", "ascending": LEVELS, "rule_ids": ["toy.definition"]}
]

# The cards of a course, and the course's last card end (a `first`).
CARDS_OF_COURSE = {"record": "card", "where": [{"field": "this.course", "same_as": "outer.id"}]}
LAST_CARD_END = {"first": {"of": CARDS_OF_COURSE, "field": "card_end", "pick": "latest"}}

STAGES: list[dict[str, Any]] = [
    {
        "id": "course",
        "label": "Course",
        "for_each": {"record": "course"},
        "entered_when": ["this.start"],
        "rule_ids": ["toy.definition"],
        "span": {
            "starts": {"fact": "this.start"},
            "ends": {
                # The end as it stood on the day the course was joined, or today.
                "earliest_of": [
                    {"fact": "this.end", "as_of": {"fact": "today"}},
                    {"optional": True, "day_after": True, **LAST_CARD_END},
                ]
            },
            "longest": {"rule": "toy.longest"},
            "ends_also": [
                {"when": {"fact": "this.end"}, "rule_ids": ["toy.definition"]},
            ],
        },
        "windows": [
            {
                "id": "course.apply",
                "label": "Apply",
                "opens": {"fact": "this.end", "add": [{"rule": "toy.before_days", "sign": -1}]},
                "closes": {"fact": "this.end", "add": [{"rule": "toy.after_days"}]},
                "rule_ids": ["toy.before_days", "toy.after_days"],
                "done_when": ["this.joined_on"],
            },
            {
                "id": "course.renew",
                "label": "Renew",
                "opens": {"month_day_rule": "toy.renewal_day", "in_year_of": "this.start"},
                "closes": {
                    "month_day_rule": "toy.fiscal_start",
                    "in_fiscal_year_of": "this.start",
                    "fiscal_year_rule": "toy.fiscal_start",
                    "day_before": True,
                },
                "rule_ids": ["toy.renewal_day", "toy.fiscal_start"],
            },
            {
                "id": "course.cutoff",
                "label": "Cut-off",
                "opens": {"latest_of": [{"fact": "this.start"}, {"fact": "arrived_on"}]},
                "closes": {
                    "earliest_of": [
                        {"fact": "this.end"},
                        {"optional": True, "fact": "today", "add": [{"rule": "toy.lapsing"}]},
                    ]
                },
                "rule_ids": ["toy.lapsing"],
            },
        ],
        "next": [
            {
                "stage": "card",
                "only_if": [
                    {"field": "this.level", "level_above": "low"},
                    {"none": CARDS_OF_COURSE},
                ],
                "bind": {"course": "outer.id", "type": "plain"},
            }
        ],
    },
    {
        "id": "card",
        "label": "Card",
        "for_each": {"record": "card", "where": [{"field": "this.type", "in": ["plain", "extra"]}]},
        "entered_when": ["this.card_start", "this.card_end"],
        "rule_ids": ["toy.definition"],
        "span": {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}},
        "windows": [
            {
                "id": "card.file",
                "label": "File",
                "opens": {
                    "fact": "this.course.end",
                    "add": [{"rule": "toy.before_days", "sign": -1}],
                },
                "closes": {"fact": "this.course.end", "add": [{"rule": "toy.months"}]},
                "rule_ids": ["toy.before_days", "toy.months"],
                "done_when": ["this.filed_on"],
            },
        ],
    },
]

CHECKS: list[dict[str, Any]] = [
    {
        "id": "card.inside_course",
        "for_each": {"record": "card"},
        "holds": [
            {"field": "this.card_start", "on_or_after": {"fact": "this.course.start"}},
            {
                "field": "this.card_end",
                "on_or_before": {"fact": "this.course.end", "add": [{"rule": "toy.months"}]},
            },
        ],
        "rule_ids": ["toy.months"],
    },
    {
        "id": "job.hours",
        "kind": "judgement",
        "for_each": {"record": "job"},
        "only_if": [{"field": "this.on_campus", "present": True}],
        "holds": [{"field": "this.hours_per_week", "at_most": {"rule": "toy.hours"}}],
        "rule_ids": ["toy.hours"],
    },
    {
        "id": "job.order",
        "for_each": {"record": "job"},
        "holds": [
            {
                "any_of": [
                    {"field": "this.end", "after": {"fact": "this.start"}},
                    {"not": {"field": "this.end", "before": {"fact": "this.start"}}},
                ]
            }
        ],
        "rule_ids": ["toy.definition"],
    },
    {
        "id": "course.renewal_day",
        "kind": "judgement",
        "for_each": {"record": "course", "where": [{"field": "this.joined_on", "present": True}]},
        "holds": [
            {
                "all_of": [
                    {"field": "this.joined_on", "month_day_is": "toy.renewal_day"},
                    {"field": "this.online"},
                ]
            }
        ],
        "rule_ids": ["toy.renewal_day"],
    },
    {
        "id": "card.levels",
        "for_each": {"record": "card", "where": [{"field": "this.extends", "present": True}]},
        # this.extends can be NONE, so its comparisons sit under a present: true in the same
        # all_of (the point 7a lint).
        "holds": [
            {
                "all_of": [
                    {"field": "this.extends", "present": True},
                    {
                        "any_of": [
                            {
                                "field": "this.course.level",
                                "level_same": "this.extends.course.level",
                            },
                            {
                                "field": "this.course.level",
                                "level_below": "this.extends.course.level",
                            },
                        ]
                    },
                    {"field": "this.course", "differs_from": "this.extends.course"},
                ]
            }
        ],
        "rule_ids": ["toy.definition"],
    },
    {
        "id": "card.cap",
        "kind": "judgement",
        "holds": [
            {
                "count_below": {
                    "of": {"record": "card", "where": [{"field": "this.type", "in": ["extra"]}]},
                    "rule": "toy.cap",
                }
            },
            {"count_at_most": {"of": {"record": "job"}, "rule": "toy.cap"}},
            {"exists": {"record": "course"}},
        ],
        "rule_ids": ["toy.cap"],
    },
]

COUNTERS: list[dict[str, Any]] = [
    {
        "id": "idle.card",
        "calculator": "days_without_qualifying_period",
        "scope": {
            "of": {"record": "card", "where": [{"field": "this.type", "in": ["plain"]}]},
            "group": "record",
        },
        "span": {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}},
        "qualifying": {"record": "job", "where": [{"field": "this.under", "same_as": "outer.id"}]},
        "hours_rule": "toy.hours",
        "limit_rule": "toy.bar",
        "rule_ids": ["toy.bar", "toy.hours"],
    },
    {
        "id": "idle.chain",
        "calculator": "days_without_qualifying_period",
        "scope": {"of": {"record": "card"}, "group": "chain", "chain_link": "extends"},
        "span": {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}},
        "qualifying": {"record": "job", "where": [{"field": "this.under", "same_as": "outer.id"}]},
        "not_qualifying": {
            "record": "job",
            "where": [{"field": "this.on_campus", "present": True}],
        },
        "hours_rule": "toy.lapsing_hours",
        "limit_rule": "toy.lapsing",
        "rule_ids": ["toy.lapsing", "toy.lapsing_hours"],
    },
    {
        "id": "days.level",
        "calculator": "sum_of_days",
        "scope": {"of": {"record": "card"}, "group": "same_value", "value_of": "this.course.level"},
        "span": {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}},
        "limit_rule": "toy.bar",
        "rule_ids": ["toy.bar"],
    },
    {
        "id": "months.level",
        "calculator": "sum_of_months",
        "scope": {"of": {"record": "card"}, "group": "same_value", "value_of": "this.course.level"},
        "span": {"starts": {"fact": "this.card_start"}, "ends": {"fact": "this.card_end"}},
        "only_if": [{"field": "this.course.online", "present": True}],
        "limit_rule": "toy.month_bar",
        "rule_ids": ["toy.month_bar"],
    },
    {
        "id": "cards.all",
        "calculator": "count_of_records",
        "scope": {
            "of": {"record": "card", "where": [{"field": "this.type", "in": ["extra"]}]},
            "group": "all",
        },
        "limit_rule": "toy.cap",
        "rule_ids": ["toy.cap"],
    },
]


def pack_dict(
    *,
    stages: list[dict[str, Any]] | None = None,
    checks: list[dict[str, Any]] | None = None,
    counters: list[dict[str, Any]] | None = None,
    records: list[dict[str, Any]] | None = None,
    rules: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """The whole toy pack, or with one part replaced. Deep copies: a test may change its own."""
    return copy.deepcopy(
        {
            "category": CATEGORY,
            "jurisdiction": "us",
            "version": "v2026.09",
            "regimes": [],
            "parameters": RULES if rules is None else rules,
            "path": {
                "facts": FACTS,
                "records": RECORDS if records is None else records,
                "order": ORDER,
                "stages": STAGES if stages is None else stages,
                "checks": CHECKS if checks is None else checks,
                "counters": COUNTERS if counters is None else counters,
            },
        }
    )


def pack(**parts: Any) -> Rulepack:
    raw = pack_dict(**parts)
    assert schema_problems(raw) == []  # the toy pack itself follows the contract
    return validate_pack(raw)


def check_pack(condition: dict[str, Any]) -> Rulepack:
    """P6: the toy records with one check, on the course, whose `holds` is one generated tree.
    A conflict on c1 means the tree is F; no conflict and nothing asked means T."""
    check = {
        "id": "tree",
        "for_each": {"record": "course"},
        "holds": [condition],
        "rule_ids": ["toy.cap"],
    }
    # One stage that reads only the course start, so the category is covered and nothing else
    # is read.
    stage = {
        "id": "course",
        "label": "Course",
        "for_each": {"record": "course"},
        "entered_when": ["this.start"],
        "rule_ids": ["toy.definition"],
    }
    return pack(stages=[stage], checks=[check], counters=[])


def rec(record_id: str, kind: str, **fields: Any) -> dict[str, Any]:
    return {"id": record_id, "kind": kind, "fields": dict(fields)}


def case(
    records: list[dict[str, Any]],
    on: date,
    *,
    facts: dict[str, Any] | None = None,
    whole: tuple[str, ...] = ("course", "card", "job", "change", "employer"),
) -> dict[str, Any]:
    stated = {"on": on.isoformat()}
    return {
        "categories": [CATEGORY],
        "time_zone": "UTC",
        "facts": dict(facts or {}),
        "records": records,
        "complete": dict.fromkeys(whole, stated),
    }
