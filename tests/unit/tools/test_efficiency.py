"""The factory reports where its time went, from its own record."""

import json
from pathlib import Path

from tools.factory import efficiency
from tools.factory.paths import REPO_ROOT

ROWS = [
    {
        "at": "2026-09-29T12:00:00+00:00",
        "lane": "founder",
        "kind": "start",
        "message": "round tests: L-tests",
    },
    {
        "at": "2026-09-29T12:00:00+00:00",
        "lane": "L-tests",
        "kind": "start",
        "run_id": "l-tests-1",
        "message": "go",
    },
    {
        "at": "2026-09-29T12:30:00+00:00",
        "lane": "L-tests",
        "kind": "done",
        "run_id": "l-tests-1",
        "message": "done",
    },
    {
        "at": "2026-09-29T12:31:00+00:00",
        "lane": "founder",
        "kind": "step",
        "message": "pull request ready for round tests",
    },
    {
        "at": "2026-09-29T12:41:00+00:00",
        "lane": "founder",
        "kind": "step",
        "message": "clean CI for round tests: 2 checks",
    },
    {
        "at": "2026-09-29T12:42:00+00:00",
        "lane": "founder",
        "kind": "step",
        "message": "review: VETO, scores {}",
    },
    {
        "at": "2026-09-29T12:42:00+00:00",
        "lane": "founder",
        "kind": "blocked",
        "message": "round review stopped",
    },
    {
        "at": "2026-09-29T13:12:00+00:00",
        "lane": "founder",
        "kind": "start",
        "message": "round review: L-review",
    },
    {
        "at": "2026-09-29T13:12:00+00:00",
        "lane": "health",
        "kind": "start",
        "run_id": "health-1",
        "message": "x",
    },
    {
        "at": "2026-09-29T14:00:00+00:00",
        "lane": "founder",
        "kind": "step",
        "message": "review: APPROVE, scores {}",
    },
]


def test_the_report_counts_agents_ci_stops_and_reviews():
    out = efficiency.report(ROWS)
    assert round(out.wall_hours, 2) == 2.0
    assert out.agent_seconds == {"L-tests": 1800.0}  # health checks are left out
    assert (out.ci_waits, out.ci_seconds) == (1, 600.0)
    assert (out.stops, out.stop_seconds) == (1, 1800.0)
    assert (out.reviews, out.vetoes) == (2, 1)
    text = "\n".join(out.lines())
    assert "CI waits: 1, 0.2 h" in text
    assert "reviews: 2, vetoes: 1" in text


def test_a_window_narrows_the_report_and_an_empty_one_is_empty():
    assert efficiency.report(ROWS, since="2026-09-29T13:00").reviews == 1
    assert efficiency.report(ROWS, since="2027-01-01").wall_hours == 0.0


def run(plan: str, agent: str, start: str, end: str, **extra) -> dict:
    return {
        "task": f"{plan}/build/L-x",
        "agent": agent,
        "cost_usd": 1.5,
        "turns": 10,
        "started_at": f"2026-09-29T{start}:00+00:00",
        "ended_at": f"2026-09-29T{end}:00+00:00",
        **extra,
    }


RUNS = [
    run(
        "product-2",
        "builder",
        "12:00",
        "13:00",
        tokens={
            "input_tokens": 100,
            "cache_creation_input_tokens": 2_000_000,
            "cache_read_input_tokens": 1_000_000,
            "output_tokens": 50_000,
        },
    ),
    run("product-2", "reviewer", "13:00", "14:30", tokens_in=500_000, tokens_out=20),
    run("health", "builder", "12:10", "12:20", tokens_in=100, tokens_out=1),
]
REVIEWS = [
    {"at": "2026-09-29T14:30:00+00:00", "task": "product-2/review/L-review", "decision": "VETO"},
    {
        "at": "2026-09-29T15:00:00+00:00",
        "plan": "ui-1",
        "task": "product-2/r/L",
        "decision": "VETO",
    },
]


def at(minute: int) -> str:
    return f"2026-09-29T15:{minute:02d}:00+00:00"


def founder(minute: int, kind: str, message: str, **extra) -> dict:
    return {"at": at(minute), "lane": "founder", "kind": kind, "message": message, **extra}


def agent_stop(minute: int, cause: str) -> dict:
    return {"at": at(minute), "lane": "L-x", "kind": "blocked", "plan": "product-2", "cause": cause}


STOPS = [
    # A stop before any round of a plan is filed under none.
    founder(0, "blocked", "an old stop, no plan"),
    # The founder named the cause of this stop; it wins over the agent's.
    founder(1, "start", "round r1: L-x"),
    agent_stop(2, "spec"),
    founder(3, "blocked", "round r1 stopped", plan="product-2", cause="unknown", hash="a"),
    # No one named one, so the agent's own stop in the round gives it; the agent's stop is
    # not counted again.
    founder(4, "start", "round r2: L-x"),
    agent_stop(5, "spec"),
    founder(6, "blocked", "round r2 stopped", plan="product-2", cause="unknown"),
    # Work held for the founder's approval is not a stop.
    founder(7, "start", "round r3: L-x"),
    founder(8, "held", "L-x: 2 files on lane/x, waiting for the founder", plan="product-2"),
    agent_stop(9, "unknown"),
    founder(10, "blocked", "round r3 stopped", plan="product-2", cause="infra"),
    founder(11, "start", "round r4: L-x"),
    founder(12, "blocked", "round r4 stopped", plan="product-2", cause="luck"),
    {"at": at(20), "kind": "control", "handles": "a", "cause": "code"},
]


def test_each_plan_reports_dollars_tokens_runs_turns_vetoes_stops_and_hours():
    found = efficiency.plans(RUNS, REVIEWS, STOPS)
    p2 = found["product-2"]
    assert (p2.dollars, p2.runs, p2.turns, p2.reviews, p2.vetoes) == (3.0, 2, 20, 1, 1)
    assert p2.wall_hours == 2.5  # first run's start to last run's end
    assert p2.tokens_by_class == {
        "input": 100,
        "cache write": 2_000_000,
        "cache read": 1_000_000,
        "output": 50_000,
        "input and cache": 500_000,
        "output, streamed": 20,
    }
    assert p2.tokens_by_role == {"builder": 3_050_100, "reviewer": 500_020}
    # A strange cause is unknown, and the stop with no plan is not filed under any.
    assert p2.stops == {"code": 1, "spec": 1, "infra": 1, "unknown": 1}
    assert found["ui-1"].vetoes == 1  # a review is filed under its own plan
    assert found["health"].runs == 1
    text = "\n".join(p2.lines("product-2"))
    assert "plan product-2: $3.00 list, 2 runs, 20 turns, 2.5 wall h" in text
    assert "tokens by role: builder 3.05 M, reviewer 0.50 M" in text
    assert "stops: 4 (code 1, infra 1, spec 1, unknown 1)" in text
    assert "FLAG: 1 stops have no cause" in text
    assert "FLAG" not in "\n".join(found["health"].lines("health"))


def test_a_window_narrows_each_plan():
    found = efficiency.plans(RUNS, REVIEWS, STOPS, since="2026-09-29T12:30")
    assert found["product-2"].runs == 1
    assert "health" not in found


def test_the_command_reads_the_record(tmp_path, capsys):
    rows = {"events": ROWS + STOPS, "metrics": RUNS, "reviews": REVIEWS}
    for name, lines in rows.items():
        (tmp_path / f"{name}.jsonl").write_text("\n".join(json.dumps(r) for r in lines) + "\n")
    assert efficiency.main([], state=tmp_path) == 0
    out = capsys.readouterr().out
    # The founder lane's stop rows only: agents' stops and held work are not counted.
    assert "stops: 6, 0.6 h" in out
    assert "weekly-meter change: not measured" in out  # it has no API, so it is not guessed
    assert out.index("plan product-2") < out.index("plan health") < out.index("plan ui-1")
    assert efficiency.main([], state=tmp_path / "none") == 0


# The founder lane's rows before 09-30 name no plan; they are filed by their round.
ROUNDS = [
    founder(0, "start", "round a: L-x"),
    {"at": at(0), "lane": "L-x", "kind": "start", "run_id": "h1", "task": "health/b/L-x"},
    {"at": at(1), "lane": "L-x", "kind": "start", "run_id": "x1", "task": "p1/a/L-x"},
    founder(2, "failed", "L-x: escalated: the tests contradict the SPEC"),
    founder(2, "blocked", "round a stopped"),
    # A rerun after every lane landed starts no run: it is the round before's plan.
    founder(3, "start", "round a: L-x"),
    founder(4, "failed", "check offline gates fails: coverage below 80%"),
    founder(4, "blocked", "round a stopped"),
    founder(5, "start", "round r: L-review"),
    founder(6, "step", "review: VETO, scores {}"),
    founder(6, "blocked", "round r stopped"),
    # Held work written as a blocked row before held had its own kind is not a stop.
    founder(7, "start", "round b: L-web"),
    {"at": at(7), "lane": "L-web", "kind": "start", "run_id": "w1", "task": "p2/b/L-web"},
    founder(8, "blocked", "L-web: 3 files on lane/x, waiting for the founder (dependency)"),
    # A row that names its plan and stage keeps them.
    founder(9, "blocked", "round b stopped", plan="p3", stage="ci", cause="infra"),
]


def test_older_rows_are_filed_under_the_plan_of_their_round_and_their_stage_is_read():
    found = efficiency.stop_list(ROUNDS)
    assert [(s.plan, s.stage, s.cause) for s in found] == [
        ("p1", "lane", "unknown"),
        ("p1", "checks", "unknown"),
        ("p1", "review", "unknown"),
        ("p3", "ci", "infra"),
    ]
    assert [s.source for s in found] == ["", "", "", "auto"]
    plan_of = efficiency.row_plans(ROUNDS)
    assert plan_of[1] == ""  # a check of the factory belongs to no plan
    assert efficiency.report(ROUNDS).stops == 4


def test_a_cause_a_person_named_is_human():
    stop = founder(1, "blocked", "round a stopped", plan="p", hash="s1")
    answer = {"at": at(3), "lane": "founder", "kind": "control", "handles": "s1", "cause": "spec"}
    [found] = efficiency.stop_list([founder(0, "start", "round a"), stop, answer])
    assert (found.cause, found.source) == ("spec", "human")


def metric(agent: str, start: str, end: str, **extra) -> dict:
    return run("p", agent, start, end, **extra)


FAKE_METRICS = [
    metric("builder", "10:00", "11:00", final_context=40_000, first_context=9_000, large_reads=0),
    metric("builder", "10:00", "10:30", final_context=0, first_context=0, large_reads=1),
    metric("test-author", "10:00", "10:20", final_context=50_000, first_context=8_000),
    metric("rulepack-drafter", "10:00", "10:20", final_context=70_000, first_context=8_000),
    metric("reviewer", "11:00", "12:00", turns=20, tokens_in=2_000_000, final_context=90_000),
    {**run("health", "builder", "10:30", "10:31"), "cost_usd": 0.12},
    {**run("health", "builder", "13:00", "13:01"), "cost_usd": 5.0},  # after the plan closed
]
FAKE_REVIEWS = [
    {"at": "2026-09-29T11:00:00+00:00", "plan": "p", "decision": "VETO"},
    {"at": "2026-09-29T11:15:00+00:00", "plan": "p", "decision": "VETO"},
    {"at": "2026-09-29T11:45:00+00:00", "plan": "p", "decision": "APPROVE"},
]


def fake_ledger() -> list[dict]:
    def stop(minute: int, **extra) -> dict:
        return founder(minute, "blocked", "round a stopped", plan="p", **extra)

    agent = {"lane": "L-x", "run_id": "x1", "plan": "p"}
    return [
        founder(0, "start", "round a: L-x"),
        {"at": at(0), "kind": "step", "message": "iteration 1 of 3", **agent},
        {
            "at": at(1),
            "kind": "step",
            "message": "attempt 1 not accepted: the done command fails: x",
            "signature": "sandbox.mkdtemp",
            **agent,
        },
        {"at": at(1), "kind": "step", "message": "iteration 2 of 3", **agent},
        {"at": at(2), "kind": "blocked", "message": "escalated: the command fails:  ", **agent},
        stop(2, stage="checks", cause="infra", cause_source="auto", hash="s1"),
        founder(3, "start", "round a: L-x"),
        stop(4, stage="lane", cause="spec", cause_source="auto", hash="s2"),
        founder(5, "start", "round a: L-x"),
        stop(6, stage="lane", cause="plan", cause_source="auto"),
        {
            "at": at(9),
            "lane": "founder",
            "kind": "control",
            "handles": "s1",
            "cause": "infra",
            "asked_at": at(2),
            "answered_at": at(8),
            "via": "card",
        },
        {"at": at(9), "lane": "founder", "kind": "control", "handles": "s2", "veto_upheld": True},
        {"at": at(10), "lane": "founder", "kind": "decision", "answered_at": at(12), "via": "cli"},
    ]


def test_a_fake_run_sets_every_measure_of_the_scorecard():
    card = efficiency.scorecard("p", fake_ledger(), FAKE_METRICS, FAKE_REVIEWS, files=1)
    values = {key: m["value"] for key, m in card["measures"].items()}
    assert None not in values.values()
    assert values == {
        "vetoes": 2,
        "first_review_approved": 0.0,
        "fix_cycle_hours": 0.375,  # 0.25 and 0.5 hours from a veto to the next review
        "checks_stops": 1,
        "spec_stops": 1,
        "reviewer_turns": 20.0,
        "reviewer_tokens": 2_000_000.0,
        "builder_context": 40_000.0,  # a zero is a run with nothing measured
        "test_author_context": 50_000.0,
        "drafter_context": 70_000.0,
        "reviewer_context": 90_000.0,
        "large_reads": 1,
        "dollars": 7.5,
        "wall_hours": 2.0,
        "health_share": round(0.12 / 7.62, 3),
        "stops_with_cause": 1.0,
        "infra_flake_stops": 1,
        "attempts_after_denial": 1,
        "empty_digest_escalations": 1,
        "plan_stops": 1,
        "plan_files": 1,
        "decisions_by_card": round(2 / 3, 3),
    }
    info = card["efficiency"]
    assert info["cause_source"] == {"auto": 2, "human": 1}
    assert info["stops_by_stage"] == {"checks": 1, "lane": 2}
    assert info["veto_upheld"] == {"yes": 1, "no": 0}
    assert (info["answers"], info["answer_minutes_median"]) == (3, 5.0)
    assert info["median_first_context_by_role"]["builder"] == 9_000.0
    assert json.loads(json.dumps(card)) == card
    measures = card["measures"]
    assert (measures["vetoes"]["target"], measures["vetoes"]["met"]) == ("at most 3", True)
    assert measures["reviewer_context"]["met"] is False


def test_each_measure_sits_beside_the_median_of_the_last_three_plans():
    def card(plan: str, closed: str, vetoes: float, approved: float) -> dict:
        return {
            "plan": plan,
            "closed_at": closed,
            "measures": {
                "vetoes": {"value": vetoes},
                "first_review_approved": {"value": approved},
            },
        }

    earlier = [
        card("a", "2026-09-28T00:00:00+00:00", 1, 1.0),  # the fourth plan back is left out
        card("b", "2026-09-28T01:00:00+00:00", 11, 0.0),
        card("c", "2026-09-28T02:00:00+00:00", 5, 0.0),
        card("p", "2026-09-28T03:00:00+00:00", 99, 0.0),  # this plan's own older card
        card("d", "2027-01-01T00:00:00+00:00", 99, 1.0),  # closed after this one
    ]
    new = efficiency.scorecard("p", fake_ledger(), FAKE_METRICS, FAKE_REVIEWS, 1, earlier)
    vetoes, first = new["measures"]["vetoes"], new["measures"]["first_review_approved"]
    assert (vetoes["value"], vetoes["last_three"], vetoes["met"]) == (2, 5.0, False)
    assert (first["last_three"], first["met"]) == (0.0, False)
    alone = efficiency.scorecard("none", [], [], [])
    assert alone["measures"]["fix_cycle_hours"]["last_three"] is None
    assert alone["measures"]["fix_cycle_hours"]["met"] is None
    assert "Median hours per fix cycle [M2]: none; last three none" in "\n".join(
        efficiency.scorecard_lines(alone)
    )


REPLAY = Path(__file__).parent / "efficiency_replay.json"


def test_the_product_1_and_product_2_baselines_replay_from_the_ledger():
    """B3. The totals specs/factory-2 section 4 names: 29 stops and 21 plan files match. The
    ledger holds 10 vetoes for product-2, not 11: its 11 review rows are 8 vetoes and an
    approval for product-2 itself, then the 2 ui-1 vetoes filed under product-2's task (the
    29 stops count the ui-1 ones too). The 11 is the brief's figure, with its 13 reviews, and
    no row records it."""
    data = json.loads(REPLAY.read_text())
    events, metrics, reviews = data["events"], data["metrics"], data["reviews"]
    one = efficiency.scorecard(
        "product-1", events, metrics, reviews, efficiency.plan_files(REPO_ROOT, "product-1")
    )
    two = efficiency.scorecard(
        "product-2", events, metrics, reviews, efficiency.plan_files(REPO_ROOT, "product-2"), [one]
    )
    info = two["efficiency"]
    assert (info["stops"], info["plan_files"], info["reviews"], info["vetoes"]) == (29, 21, 11, 10)
    # The stops the usability audit counted: 10 review vetoes, 14 escalations, 5 checks.
    assert info["stops_by_stage"] == {"checks": 5, "lane": 14, "review": 10}
    assert info["stops_by_cause"] == {"unknown": 29}  # no cause was recorded then
    values = {key: m["value"] for key, m in two["measures"].items()}
    assert values["wall_hours"] == 9.81
    assert values["stops_with_cause"] == 0.0
    assert values["attempts_after_denial"] == 1  # the index.lock denial, tried twice
    assert values["decisions_by_card"] == 0.0  # 24 answers, all by hand
    assert values["first_review_approved"] == 0.0
    assert two["measures"]["vetoes"]["last_three"] == 9.5  # product-1 had 9
    assert (one["efficiency"]["stops"], one["efficiency"]["plan_files"]) == (26, 14)
    assert one["measures"]["attempts_after_denial"]["value"] == 2  # mkdtemp, 3 attempts


def test_a_scorecard_is_saved_and_the_command_shows_it(tmp_path, capsys):
    state = tmp_path / ".factory"
    state.mkdir()
    rows = {"events": fake_ledger(), "metrics": FAKE_METRICS, "reviews": FAKE_REVIEWS}
    for name, lines in rows.items():
        (state / f"{name}.jsonl").write_text("\n".join(json.dumps(r) for r in lines) + "\n")
    (tmp_path / "specs" / "p").mkdir(parents=True)
    (tmp_path / "specs" / "p" / "plan.yaml").write_text("rounds: []\n")
    assert efficiency.main(["--write", "p"], state=state) == 0
    saved = json.loads((state / "scorecards" / "p.json").read_text())
    assert saved["measures"]["plan_files"]["value"] == 1
    assert efficiency.read_scorecards(state) == [saved]
    (state / "scorecards" / "broken.json").write_text("{")
    assert efficiency.read_scorecards(state) == [saved]
    out = capsys.readouterr().out
    assert "saved " in out
    assert "Plan files [ls]: 1; last three 1; target 1, met" in out
    assert efficiency.main([], state=state) == 0
    out = capsys.readouterr().out
    assert "  scorecard p (closed 2026-09-29T12:00:00+00:00):" in out
    assert "scorecard health" not in out


def test_l6_the_weekly_sample_is_a_section_of_the_scorecard(tmp_path, capsys):
    runs = [
        {**metric("builder", "10:00", "10:30"), "run_id": f"r-{n}", "status": status}
        for n, status in enumerate(["failed", "escalated", *["done"] * 10])
    ]
    picked = efficiency.sample("p", runs)
    ids = [r["run_id"] for r in picked["runs"]]
    assert ids[:2] == ["r-0", "r-1"]  # every run that did not pass
    assert len(ids) == efficiency.SAMPLE
    assert ids == [r["run_id"] for r in efficiency.sample("p", runs)["runs"]]  # the same each time
    assert picked["runs"][0]["trace"] == ".factory/runs/r-0/stream.jsonl"
    assert picked["questions"] == list(efficiency.QUESTIONS)
    card = efficiency.scorecard("p", fake_ledger(), runs, FAKE_REVIEWS, files=1)
    assert card["sample"] == picked

    state = tmp_path / ".factory"
    (state / "scorecards").mkdir(parents=True)
    old = {**card, "plan": "old", "closed_at": "2026-09-01T00:00:00+00:00"}
    del old["sample"]  # saved before the section existed
    for saved in (old, card):
        (state / "scorecards" / f"{saved['plan']}.json").write_text(json.dumps(saved))
    assert efficiency.main(["--latest", "1"], state=state) == 0
    out = capsys.readouterr().out
    assert "scorecard old" not in out
    assert "runs to read (open each in make watch, or read its trace):" in out
    assert "      trace .factory/runs/r-0/stream.jsonl" in out
    assert f"    1. {efficiency.QUESTIONS[0]}" in out
    assert efficiency.main(["--latest", "2"], state=state) == 0
    assert "runs to read: none recorded on this card" in capsys.readouterr().out
    assert efficiency.main(["--latest", "3"], state=tmp_path / "empty") == 0
    assert "no scorecard is saved yet" in capsys.readouterr().out


def test_make_weekly_prints_the_latest_scorecards_and_drift_has_no_target_of_its_own():
    import subprocess

    def dry(target: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(["make", "--no-print-directory", "-n", target], cwd=REPO_ROOT, capture_output=True, text=True)

    assert dry("weekly").stdout.strip() == "uv run python -m tools.factory.efficiency --latest 3"
    assert dry("drift").returncode != 0


def test_an_attempt_row_that_carries_its_signature_is_not_read_again():
    denied = "attempt 1 not accepted: mktemp: mkdtemp failed: Operation not permitted"
    rows = [
        {"lane": "L-x", "run_id": "x", "plan": "p", "message": "iteration 1 of 2"},
        {"lane": "L-x", "run_id": "x", "plan": "p", "message": denied, "signature": None},
        {"lane": "L-x", "run_id": "x", "plan": "p", "message": "iteration 2 of 2"},
    ]
    plan_of = efficiency.row_plans(rows)
    assert efficiency._attempts_after_denial(rows, plan_of, "p") == 0
    del rows[1]["signature"]
    assert efficiency._attempts_after_denial(rows, plan_of, "p") == 1
