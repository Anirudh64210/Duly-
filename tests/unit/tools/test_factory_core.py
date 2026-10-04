import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.support import mini_factory as mini
from tools.diff_policy.check import load_lane
from tools.factory import drift, health, jail, ledger, memory, redact, registry, sandbox, telemetry
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
        "eval-curator",
        "red-team",
        "auditor",
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
    named = {**BLOCKING, "spec_point": "4b", "kind": "wrong_date"}
    assert review_problems(review()) == []
    assert review_problems(review("VETO", findings=[named])) == []
    assert review_problems(review("VETO", low="sourced", findings=[named])) == []
    assert "call for a veto" in review_problems(review("APPROVE", findings=[named]))[0]
    assert "call for approval" in review_problems(review("VETO"))[0]
    assert review_problems({**review(), "scores": {}})
    assert review_problems(review(findings=[{**named, "kind": "Wrong Date"}]))


@pytest.mark.parametrize("decision", ["APPROVE", "VETO"])
def test_low_scores_with_no_blocking_finding_are_refused_whatever_the_decision(decision):
    # One rule in one place: low scores call for a veto, and a veto must name a blocking
    # finding, so neither decision stands until the reviewer names what the work breaks.
    problem = review_problems(review(decision, low="sourced"))[0]
    assert "call for a veto" in problem
    assert "a veto must name a blocking finding" in problem


@pytest.mark.parametrize("decision", ["APPROVE", "VETO"])
def test_a_blocking_finding_that_names_no_spec_point_or_source_is_refused(decision):
    assert "must name the SPEC point" in review_problems(review(decision, findings=[BLOCKING]))[0]
    cited = {**BLOCKING, "what_happens": "8 CFR 214.2(f)(10) says twelve months"}
    assert review_problems(review("VETO", findings=[cited])) == []


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
    who = "orchestrator"
    assert memory.record(
        "L-api", "The done command was piped and hid its exit code.", "Unpipe.", "log", who, repo
    )
    assert not memory.record(
        "L-api", "the DONE command was piped, and hid its exit code!", "x", "log", who, repo
    )
    for n in range(60):
        memory.record(
            "L-api",
            f"Failure number {'abcdefghij'[n % 10] * (n + 3)} happened.",
            "Fix it.",
            "log",
            who,
            repo,
        )
    text = memory.for_prompt("L-api", max_items=5, max_chars=10_000, cwd=repo)
    assert text.count("What went wrong") == 5
    assert text.startswith("- What went wrong: Failure number")  # newest first
    assert len(memory.for_prompt("L-api", 8, 300, repo)) <= 300


def test_memory_keeps_only_what_the_orchestrator_saw_in_this_lane(tmp_path):
    repo = mini.build(tmp_path)
    # An agent's word about its own run, and a health probe's note, are not kept.
    assert not memory.record("L-api", "Agent says so.", "x", "log", "agent report, run r", repo)
    probe = "None in the work. The write to probe.txt was refused."
    assert not memory.record("L-api", probe, "x", "log", "orchestrator", repo, task="health/a/b")
    assert memory.read(repo) == []
    # Rows written before the rule, by agents, stay out of the prompt until archived.
    old = {"lane": "L-api", "fingerprint": "f", "failure": "Old agent note.", "fix": "x"}
    (repo / ".factory").mkdir(exist_ok=True)
    (repo / ".factory" / "failures.jsonl").write_text(
        json.dumps({**old, "source": "agent report, run r"}) + "\n"
    )
    memory.record("L-web", "The web lane broke.", "x", "log", "orchestrator", repo, task="w/1")
    memory.record("L-api", "The api lane broke.", "x", "log", "orchestrator", repo, task="a/1")
    memory.record("all-lanes", "Every lane broke.", "x", "log", "orchestrator", repo, task="*/1")
    text = memory.for_prompt("L-api", 8, 3000, repo)
    assert "api lane broke" in text
    assert "Every lane broke" in text
    assert "web lane broke" not in text
    assert "Old agent note" not in text
    # The agent's old rows are archived once, beside the file; the orchestrator's stay.
    failures = repo / ".factory" / "failures.jsonl"
    (repo / ".factory" / "failures-archive.jsonl").write_text("{}\n")
    assert memory.archive_agent_rows(failures) == 1
    assert memory.archive_agent_rows(failures) == 0
    assert all(r["source"] == "orchestrator" for r in memory.read(repo))
    archive = (repo / ".factory" / "failures-archive.jsonl").read_text().splitlines()
    assert archive[0] == "{}"
    assert "Old agent note" in archive[1]
    assert memory.archive_agent_rows(repo / "missing.jsonl") == 0
    # Once the same task passes, its rows go, and the others stay.
    assert memory.passed("a/1", repo) == 1
    assert memory.passed("a/1", repo) == 0
    assert [r["failure"] for r in memory.read(repo)] == ["The web lane broke.", "Every lane broke."]


def test_the_memory_caps_are_small():
    limits = load_config()["limits"]
    assert limits["lessons_memory_max_items"] <= 8
    assert limits["lessons_memory_max_chars"] <= 3000


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
    for rel in ("tests", "web", "factory", "contracts", ".claude", ".claude/hooks"):
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
    assert jail.run("false | tail -1", inside, env).code != 0  # a pipe cannot hide a failure
    slow = jail.run("sleep 5", inside, env, timeout_seconds=1)
    assert slow.timed_out
    assert slow.code == 124


def test_a_health_pass_holds_until_that_lanes_walls_change(tmp_path):
    repo = mini.build(tmp_path)
    builder = load_contract("builder", repo)
    engine, api = (
        health.fingerprint(builder, "L-engine", repo),
        health.fingerprint(builder, "L-api", repo),
    )
    assert engine != api  # each lane has its own pass
    # The role prose and the stop conditions are not walls, so they re-run nothing.
    (repo / builder.role_file).write_text("A different role.\n")
    path = repo / "factory" / "agents" / "builder.yaml"
    path.write_text(path.read_text().replace("the factory STOP file exists", "STOP exists"))
    builder = load_contract("builder", repo)
    assert health.fingerprint(builder, "L-engine", repo) == engine
    # A change to one lane's contract re-runs that lane alone.
    lane = repo / ".claude" / "lanes" / "L-engine.yaml"
    lane.write_text(lane.read_text() + "\n# changed\n")
    assert health.fingerprint(builder, "L-engine", repo) != engine
    assert health.fingerprint(builder, "L-api", repo) == api
    # A change to the tools an agent holds re-runs its lanes.
    path.write_text(path.read_text().replace("Glob, Grep, Bash]", "Glob, Grep]"))
    builder = load_contract("builder", repo)
    assert health.fingerprint(builder, "L-api", repo) != api


def test_a_health_pass_is_tied_to_the_runners_walls_and_the_roots_code(tmp_path, monkeypatch):
    from tools.factory import agent_run

    repo = mini.build(tmp_path)
    builder = load_contract("builder", repo)
    mark = health.fingerprint(builder, "L-engine", repo)
    # The sandbox code is read from the root given, not from this checkout.
    sandbox_code = repo / "tools" / "factory" / "sandbox.py"
    sandbox_code.write_text(sandbox_code.read_text() + "\n# changed\n")
    assert health.fingerprint(builder, "L-engine", repo) != mark
    mark = health.fingerprint(builder, "L-engine", repo)
    # So are the tools, flags and settings every run starts with.
    for name, value in (
        ("TOOLS", (*agent_run.TOOLS, "Glob")),
        ("FLAGS", agent_run.FLAGS[:-1]),
        ("SETTINGS", {**agent_run.SETTINGS, "autoMemoryEnabled": True}),
        ("SETTINGS", {**agent_run.SETTINGS, "enabledPlugins": {}}),
    ):
        with monkeypatch.context() as patch:
            patch.setattr(agent_run, name, value)
            assert health.fingerprint(builder, "L-engine", repo) != mark, name
    assert health.fingerprint(builder, "L-engine", repo) == mark


def test_make_doctor_skips_a_retired_agent(tmp_path, monkeypatch, capsys):
    from tools.factory import agent_run, control

    repo = mini.build(tmp_path)
    mini.retire(repo, "reviewer")  # its lane's folder, reviews/, is there to probe
    assert load_contract("reviewer", repo).retired
    assert not load_contract("builder", repo).retired

    def never(*args, **kwargs):
        raise AssertionError("a retired agent was run")

    monkeypatch.setattr(agent_run, "run", never)
    assert control.doctor(repo, "reviewer") == 0
    assert capsys.readouterr().out == ""


def test_only_health_probes_leave_the_pinned_model(tmp_path):
    repo = mini.build(tmp_path)
    config = load_config(repo)
    assert health.model(repo) == config["model"]["health_probe"] != config["model"]["pinned"]
    assert all(c.model == config["model"]["pinned"] for c in all_contracts(repo))
    prompt = health.prompt("Write HEALTH.txt, then try x.", "L-engine", "engine", "r-1")
    assert "Write HEALTH.txt, then try x." in prompt
    assert '"run_id": "r-1"' in prompt
    assert len(prompt) < 1000
    import yaml

    del config["model"]["health_probe"]
    (repo / "factory" / "config.yaml").write_text(yaml.safe_dump(config))
    assert health.model(repo) == config["model"]["pinned"]


def test_the_parts_d68_retired_are_gone():
    for rel in (
        ".claude/LESSONS",
        "proposals",
        ".claude/agents/skill-curator.md",
        "factory/agents/skill-curator.yaml",
        ".claude/lanes/L-factory.yaml",
        ".claude/hooks/lane_test.py",
    ):
        # What the repository tracks, not this disk: git keeps no empty folder, so a leftover
        # empty one on a working machine is not a retired part coming back.
        tracked = subprocess.run(
            ["git", "-C", str(mini.REAL), "ls-files", "--", rel],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        assert tracked == "", rel
    # No Stop hook holds a turn: a factory run's done command is checked by the orchestrator.
    settings = json.loads((mini.REAL / ".claude" / "settings.json").read_text())
    assert "Stop" not in settings["hooks"]
    targets = (mini.REAL / "Makefile").read_text().splitlines()
    assert not any(line.startswith("lane:") for line in targets)


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


SUBSCRIPTION = '{"loggedIn": true, "authMethod": "claude.ai", "subscriptionType": "max"}'


def test_the_factory_runs_on_a_subscription_login_only():
    from tools.factory import billing

    assert billing.require_subscription(SUBSCRIPTION) == "max"
    for status, problem in (
        ('{"loggedIn": false}', "not logged in"),
        ('{"loggedIn": true, "authMethod": "apiKey"}', "charged per use"),
        ('{"loggedIn": true, "authMethod": "console"}', "charged per use"),
        ("not json", "not logged in"),
    ):
        with pytest.raises(billing.BillingError, match=problem):
            billing.require_subscription(status)


def test_no_paid_route_reaches_an_agent(tmp_path):
    from tools.factory import billing

    base = {"PATH": "/bin", "HOME": "/h", **dict.fromkeys(billing.PAID_ROUTES, "x")}
    assert not set(billing.PAID_ROUTES) & set(billing.strip_paid_routes(base))
    env = sandbox.environment(base, tmp_path, tmp_path / "w", "L-api", "r-1", "true")
    assert not set(billing.PAID_ROUTES) & set(env)


def test_project_settings_may_not_name_a_key_or_a_helper(tmp_path):
    import json

    from tools.factory import billing

    folder = tmp_path / ".claude"
    folder.mkdir()
    assert billing.settings_problems(tmp_path) == []
    (folder / "settings.json").write_text(json.dumps({"hooks": {}}))
    assert billing.settings_problems(tmp_path) == []
    (folder / "settings.json").write_text(
        json.dumps({"apiKeyHelper": "get-key.sh", "env": {"ANTHROPIC_API_KEY": "k", "A": "b"}})
    )
    assert billing.settings_problems(tmp_path) == [
        ".claude/settings.json sets apiKeyHelper",
        ".claude/settings.json sets ANTHROPIC_API_KEY in env",
    ]


def test_a_run_that_reports_a_key_is_recognised():
    from tools.factory import billing

    assert billing.key_in_use({"apiKeySource": "none"}) == ""
    assert billing.key_in_use({}) == ""
    assert billing.key_in_use({"apiKeySource": "ANTHROPIC_API_KEY"}) == "ANTHROPIC_API_KEY"


def test_prose_lessons_do_not_reach_the_agents(tmp_path):
    repo = mini.build(tmp_path)
    lessons = repo / ".claude" / "LESSONS"
    lessons.mkdir(parents=True, exist_ok=True)
    (lessons / "L-content.md").write_text(
        "# Lessons\n\n## a\n\n- What went wrong: A document number was written from memory.\n"
        "- What fixes it: Look it up and confirm the title.\n- Evidence: x\n"
    )
    (lessons / "all-lanes.md").write_text(
        "## b\n\n- What went wrong: A pipe hid the exit code.\n- What fixes it: Run it unpiped.\n"
    )
    (lessons / "factory-fixed.md").write_text(
        "## c\n\n- What went wrong: The guard blocked pytest.\n- What fixes it: Fixed.\n"
    )
    # Only the orchestrator's rows reach an agent, never the prose lessons.
    assert memory.for_prompt("L-content", 40, 12000, repo) == ""
    memory.record("all-lanes", "A pipe hid the exit code.", "Unpipe.", "log", "orchestrator", repo)
    assert "pipe hid the exit code" in memory.for_prompt("L-content", 40, 12000, repo)


def test_the_jail_allows_a_private_socket_only_where_it_may_write(tmp_path):
    if not jail.available():
        pytest.skip("no sandbox on this machine")
    import shutil
    import tempfile

    # A short folder: macOS limits a socket path to 103 bytes, and pytest's tmp_path is longer.
    inside = Path(tempfile.mkdtemp(dir="/tmp", prefix="dj"))
    env = {"PATH": os.environ["PATH"], "HOME": str(tmp_path)}
    probe = (
        "import os, socket, sys\n"
        "p = sys.argv[1]\n"
        "s = socket.socket(socket.AF_UNIX)\n"
        "s.bind(p); s.listen(1)\n"
        "c = socket.socket(socket.AF_UNIX); c.connect(p); print('ok')\n"
    )
    (inside / "probe.py").write_text(probe)
    short = inside / "s.sock"
    assert jail.run(f"{sys.executable} probe.py {short}", inside, env).output.strip().endswith("ok")
    outside = Path(os.path.realpath("/tmp")) / f"duly-jail-{os.getpid()}.sock"
    try:
        assert jail.run(f"{sys.executable} probe.py {outside}", inside, env).code != 0
    finally:
        shutil.rmtree(inside, ignore_errors=True)
