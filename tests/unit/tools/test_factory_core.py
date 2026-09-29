import os

import pytest

from tests.support import mini_factory as mini
from tools.diff_policy.check import load_lane
from tools.factory import drift, jail, ledger, memory, redact, registry, sandbox, telemetry
from tools.factory.config import (
    ConfigError,
    all_contracts,
    load_config,
    load_contract,
    report_problems,
    review_problems,
)

REPORT = {
    "run_id": "r-1",
    "status": "done",
    "summary": "Did what was asked of it.",
    "commands_run": [{"command": "pytest", "exit_code": 0}],
    "files_changed": ["a.py"],
    "lessons": [],
    "disputes": [],
    "requests": [],
}


def review(decision="APPROVE", low=None, findings=()):
    scores = {
        name: {"score": 5, "evidence": "Ran it by hand and it held."}
        for name in (
            "correct",
            "sourced",
            "never_assumes",
            "inside_the_boundary",
            "secure",
            "tested",
        )
    }
    if low:
        scores[low]["score"] = 3
    return {
        "run_id": "r",
        "reviewed_commit": "abc1234",
        "scores": scores,
        "findings": list(findings),
        "decision": decision,
    }


BLOCKING = {"severity": "blocking", "title": "t", "file": "f", "input": "i", "what_happens": "w"}


def test_every_shipped_contract_loads_and_is_complete():
    contracts = all_contracts()
    assert {c.name for c in contracts} == {
        "builder",
        "test-author",
        "rulepack-drafter",
        "reviewer",
        "skill-curator",
        "eval-curator",
        "red-team",
    }
    config = load_config()
    for c in contracts:
        assert c.model == config["model"]["pinned"]
        assert c.max_turns
        assert c.token_budget
        assert c.timeout_minutes
        assert c.stop_conditions
        assert "Agent" not in c.tools
    drafter = load_contract("rulepack-drafter")
    assert "www.ecfr.gov" in drafter.network
    assert all(not c.network for c in contracts if c.name != "rulepack-drafter")


@pytest.mark.parametrize(
    ("field", "value", "problem"),
    [
        ("model", "claude-haiku-4-5", "not the pinned model"),
        ("budget_usd", 9999.0, "above the cap"),
        ("max_attempts", 9, "more attempts"),
        ("role_file", ".claude/agents/nobody.md", "does not exist"),
        ("max_turns", 0, "max_turns"),
        ("tools", ["Read", "Agent"], "tools"),
        ("timeout_minutes", 100000, "timeout_minutes"),
    ],
)
def test_a_contract_outside_the_limits_is_refused(tmp_path, field, value, problem):
    repo = mini.build(tmp_path)
    path = repo / "factory" / "agents" / "builder.yaml"
    import yaml

    raw = yaml.safe_load(path.read_text())
    raw[field] = value
    path.write_text(yaml.safe_dump(raw))
    with pytest.raises(ConfigError, match=problem):
        load_contract("builder", repo)


def test_a_config_that_opens_the_network_or_allows_subagents_is_refused(tmp_path):
    import yaml

    for section, key, value in (
        ("network", "default", "allow"),
        ("limits", "max_subagent_depth", 2),
    ):
        (tmp_path / section).mkdir()
        repo = mini.build(tmp_path / section)
        path = repo / "factory" / "config.yaml"
        raw = yaml.safe_load(path.read_text())
        raw[section][key] = value
        path.write_text(yaml.safe_dump(raw))
        with pytest.raises(ConfigError):
            load_config(repo)


def test_reports_are_held_to_their_schema():
    assert report_problems(REPORT) == []
    assert report_problems({**REPORT, "status": "great"})
    assert report_problems({k: v for k, v in REPORT.items() if k != "lessons"})
    assert report_problems({**REPORT, "confidence": "high"})


def test_a_review_must_follow_from_its_own_scores():
    assert review_problems(review()) == []
    assert review_problems(review("VETO", low="sourced")) == []
    assert "call for a veto" in review_problems(review("APPROVE", low="sourced"))[0]
    assert "call for a veto" in review_problems(review("APPROVE", findings=[BLOCKING]))[0]
    assert review_problems({**review(), "scores": {}})


def test_the_ledger_seals_every_line_and_shows_tampering(tmp_path):
    repo = mini.build(tmp_path)
    for n in range(4):
        ledger.append("L-api", "builder", "step", f"step {n}", repo, run_id="r-1")
    assert ledger.verify(repo) == []
    path = ledger.ledger_path(repo)
    lines = path.read_text().splitlines()
    path.write_text("\n".join([lines[0], lines[1].replace("step 1", "step X"), *lines[2:]]) + "\n")
    assert ledger.verify(repo) == ["line 2: contents do not match their seal"]
    path.write_text("\n".join([lines[0], *lines[2:]]) + "\n")
    assert ledger.verify(repo) == ["line 2: does not follow the line before it"]
    with pytest.raises(ValueError, match="unknown kind"):
        ledger.append("L-api", "builder", "gossip", "x", repo)


def test_secrets_never_reach_the_ledger(tmp_path):
    repo = mini.build(tmp_path)
    token = "gh" + "p_" + "a1B2" * 9
    row = ledger.append(
        "L-api", "builder", "step", f"runs curl -H 'Authorization: Bearer {token}'", repo
    )
    assert token not in row["message"]
    assert token not in ledger.ledger_path(repo).read_text()


# Made at run time, so that no line in this file looks like a secret to a scanner.
FILL = "abcdefgh" + "12345678"
SECRETS = [
    "sk-" + "ant-" + "x" * 30,
    "AK" + "IA" + "A" * 16,
    "gh" + "o_" + "b" * 36,
    "pass" + "word = " + FILL,
    "API_" + "KEY: '" + FILL + "'",
    "-----BEGIN " + "PRIVATE KEY-----\nabc\n-----END " + "PRIVATE KEY-----",
]


@pytest.mark.parametrize("secret", SECRETS)
def test_redaction(secret):
    out = redact.redact(f"before {secret} after")
    assert "[redacted]" in out
    assert secret.split()[-1].strip("'") not in out
    assert out.startswith("before ")


def test_plain_text_is_left_alone():
    text = "runs uv run pytest tests/unit/engine -q, the route key is paths"
    assert redact.redact(text) == text


def test_the_kill_switch_ends_runs_and_blocks_new_ones(tmp_path):
    import subprocess

    repo = mini.build(tmp_path)
    sleeper = subprocess.Popen(["sleep", "60"], start_new_session=True)
    registry.claim("r-1", "L-api", "t/1", "w", "c", "builder", repo, pid=sleeper.pid)
    assert list(registry.active(repo)) == ["r-1"]
    assert registry.stop_all("test", repo) == ["r-1"]
    assert sleeper.wait(timeout=10) != 0
    assert registry.stopped(repo)
    with pytest.raises(registry.StoppedError):
        registry.claim("r-2", "L-web", "t/2", "w", "c", "builder", repo, pid=os.getpid())
    assert registry.resume(repo)
    assert not registry.resume(repo)


def test_memory_removes_repeats_and_keeps_to_its_caps(tmp_path):
    repo = mini.build(tmp_path)
    assert memory.record(
        "L-api", "The done command was piped and hid its exit code.", "Unpipe.", "log", "test", repo
    )
    assert not memory.record(
        "L-web", "the DONE command was piped, and hid its exit code!", "x", "log", "test", repo
    )
    for n in range(60):
        memory.record(
            "L-web",
            f"Failure number {'abcdefghij'[n % 10] * (n + 3)} happened.",
            "Fix it.",
            "log",
            "test",
            repo,
        )
    text = memory.for_prompt("L-api", max_items=5, max_chars=10_000, cwd=repo)
    assert text.count("What went wrong") == 5
    assert text.startswith("- What went wrong: The done command was piped")  # own lane first
    assert len(memory.for_prompt("L-api", 40, 300, repo)) <= 300


def test_metrics_for_each_agent():
    runs = [
        {"agent": "builder", "status": "done", "attempts": 1, "cost_usd": 2.0, "seconds": 120},
        {"agent": "builder", "status": "failed", "attempts": 3, "cost_usd": 4.0, "seconds": 600},
    ]
    assert telemetry.summary(runs) == {
        "builder": {
            "runs": 2,
            "success_rate": 0.5,
            "mean_attempts": 2.0,
            "mean_cost_usd": 3.0,
            "mean_minutes": 6.0,
        }
    }


def test_traces_use_the_genai_names():
    span = telemetry.span(
        "r-1",
        "invoke_agent builder",
        "2026-09-29T12:00:00+00:00",
        "2026-09-29T12:05:00+00:00",
        {
            "gen_ai.agent.name": "builder",
            "gen_ai.usage.input_tokens": 10,
            "duly.cost_usd": 1.5,
            "ok": True,
        },
        ok=False,
    )
    keys = {a["key"]: a["value"] for a in span["attributes"]}
    assert keys["gen_ai.agent.name"] == {"stringValue": "builder"}
    assert keys["gen_ai.usage.input_tokens"] == {"intValue": "10"}
    assert keys["duly.cost_usd"] == {"doubleValue": 1.5}
    assert len(span["traceId"]) == 32
    assert len(span["spanId"]) == 16
    assert span["status"]["code"] == 2
    assert int(span["endTimeUnixNano"]) - int(span["startTimeUnixNano"]) == 300 * 10**9


def test_the_sandbox_settings_for_a_lane(tmp_path):
    repo = mini.build(tmp_path)
    tree = repo  # the shape is what matters here
    lane = load_lane("L-engine", repo)
    settings = sandbox.settings_for(
        tree, lane, load_contract("builder", repo), True, repo, ["main", "phase-x"]
    )
    box, perms = settings["sandbox"], settings["permissions"]
    assert box["enabled"]
    assert box["failIfUnavailable"]
    assert not box["allowUnsandboxedCommands"]
    assert box["network"] == {
        "allowedDomains": [],
        "strictAllowlist": True,
        "allowLocalBinding": True,
    }
    denied = box["filesystem"]["denyWrite"]
    for rel in ("tests", "web", "factory", "contracts", ".claude/hooks"):
        assert str(repo / rel) in denied
    assert str(repo / "engine") not in denied
    assert str(repo / ".git" / "refs" / "heads" / "main") in denied
    assert str(repo / ".git" / "refs" / "heads" / "phase-x") in denied
    assert str(repo / "tests" / "holdout") in box["filesystem"]["denyRead"]
    assert "~/.ssh" in box["filesystem"]["denyRead"]
    assert perms["defaultMode"] == "dontAsk"
    assert {"Agent", "Task", "WebFetch", "WebSearch"} <= set(perms["deny"])
    assert any(
        rule.startswith("Edit(//") and rule.endswith("/engine/**)") for rule in perms["allow"]
    )

    drafter = sandbox.settings_for(
        tree,
        load_lane("L-content", repo),
        load_contract("rulepack-drafter", repo),
        True,
        repo,
        ["main"],
    )
    assert "www.ecfr.gov" in drafter["sandbox"]["network"]["allowedDomains"]


def test_an_agents_environment_holds_no_secrets(tmp_path):
    base = {
        "PATH": "/bin",
        "HOME": "/h",
        "AWS_SECRET_ACCESS_KEY": "x",
        "GITHUB_TOKEN": "y",
        "ANTHROPIC_API_KEY": "z",
        "SSH_AUTH_SOCK": "/s",
    }
    env = sandbox.environment(base, tmp_path, tmp_path / "w", "L-api", "r-1", "true")
    assert not {
        "AWS_SECRET_ACCESS_KEY",
        "GITHUB_TOKEN",
        "ANTHROPIC_API_KEY",
        "SSH_AUTH_SOCK",
    } & set(env)
    assert env["DULY_RUN_ID"] == "r-1"
    assert env["UV_OFFLINE"] == "1"


@pytest.mark.skipif(not jail.available(), reason="no sandbox on this machine")
def test_the_jail_has_no_network_no_keys_and_no_way_out(tmp_path):
    env = {"PATH": os.environ["PATH"], "HOME": os.environ["HOME"]}
    inside = tmp_path / "inside"
    inside.mkdir()
    outside = tmp_path / "outside.txt"
    assert jail.run("echo ok > here.txt && cat here.txt", inside, env).output.strip() == "ok"
    assert jail.run(f"echo x > {outside}", inside, env).code != 0
    assert not outside.exists()
    assert jail.run("curl -sS -m 5 https://example.com -o /dev/null", inside, env).code != 0
    assert jail.run("ls ~/.ssh", inside, env).code != 0
    slow = jail.run("sleep 5", inside, env, timeout_seconds=1)
    assert slow.timed_out
    assert slow.code == 124


def test_judge_drift_is_a_number():
    old = {"correct": 5, "sourced": 4, "secure": 5}
    assert drift.moved(old, {"correct": 5, "sourced": 4, "secure": 5}) == 0
    assert drift.moved(old, {"correct": 3, "sourced": 4, "secure": 4}) == 1.0
    assert drift.moved(old, {}) == 0
    reviews = [
        {"run_id": "a", "scores": old},
        {"run_id": "b", "scores": old},
        {"run_id": "c", "scores": old, "rescored": "a"},
    ]
    assert drift.pick(reviews)["run_id"] == "b"
    assert drift.pick([reviews[0], reviews[2]]) is None
